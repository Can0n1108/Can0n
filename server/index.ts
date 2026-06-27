import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, desc, sql, and } from 'drizzle-orm';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { runMultiAgentAnalysis } from './services/gemini';
import { users, analysisHistory } from '../shared/schema';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'can0n-ai-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
    },
}));

declare module 'express-session' {
    interface SessionData {
        userId: number;
        username: string;
    }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session.userId) {
        return res.status(401).json({ error: '请先登录' });
    }
    next();
}

// ==================== 认证路由 ====================
app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
        if (password.length < 6) return res.status(400).json({ error: '密码至少6位' });

        const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (existing.length > 0) return res.status(400).json({ error: '用户名已存在' });

        const passwordHash = await bcrypt.hash(password, 10);
        const [newUser] = await db.insert(users).values({ username, email: email || null, passwordHash }).returning();

        req.session.userId = newUser.id;
        req.session.username = newUser.username;
        res.json({ id: newUser.id, username: newUser.username, email: newUser.email });
    } catch (err: any) {
        console.error('注册失败:', err);
        res.status(500).json({ error: '注册失败，请稍后重试' });
    }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

        const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (result.length === 0) return res.status(401).json({ error: '用户名或密码错误' });

        const user = result[0];
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return res.status(401).json({ error: '用户名或密码错误' });

        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({ id: user.id, username: user.username, email: user.email });
    } catch (err: any) {
        console.error('登录失败:', err);
        res.status(500).json({ error: '登录失败，请稍后重试' });
    }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: '登出失败' });
        res.clearCookie('connect.sid');
        res.json({ message: '已登出' });
    });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: '未登录' });
    res.json({ id: req.session.userId, username: req.session.username });
});

// ==================== 仪表盘统计 ====================
app.get('/api/dashboard/stats', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.session.userId!;

        const [totalResult] = await db.select({ count: sql<number>`count(*)` })
            .from(analysisHistory)
            .where(eq(analysisHistory.userId, userId));

        const [completedResult] = await db.select({ count: sql<number>`count(*)` })
            .from(analysisHistory)
            .where(and(eq(analysisHistory.userId, userId), eq(analysisHistory.status, 'completed')));

        const recentRecords = await db.select({
            id: analysisHistory.id,
            patientName: analysisHistory.patientName,
            status: analysisHistory.status,
            createdAt: analysisHistory.createdAt,
        })
            .from(analysisHistory)
            .where(eq(analysisHistory.userId, userId))
            .orderBy(desc(analysisHistory.createdAt))
            .limit(5);

        res.json({
            totalAnalyses: Number(totalResult?.count || 0),
            completedAnalyses: Number(completedResult?.count || 0),
            successRate: totalResult?.count ? Math.round((Number(completedResult?.count || 0) / Number(totalResult.count)) * 100) : 0,
            recentRecords,
        });
    } catch (err: any) {
        console.error('获取统计数据失败:', err);
        res.status(500).json({ error: '获取统计数据失败' });
    }
});

// ==================== 分析路由 ====================
const activeTasks = new Map<string, { ws: WebSocket }>();
const pendingTasks = new Map<string, { recordId: number; inputText: string; location?: { lat: number; lng: number } }>();

app.post('/api/analysis/start', requireAuth, async (req: Request, res: Response) => {
    try {
        const { patientName, age, gender, fileText, location } = req.body;
        const userId = req.session.userId!;

        if (!fileText) return res.status(400).json({ error: '请输入分析文本' });

        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const [record] = await db.insert(analysisHistory).values({
            userId, patientName: patientName || '', age: age || '', gender: gender || '',
            inputText: fileText, status: 'analyzing',
        }).returning();

        res.json({ taskId, recordId: record.id });
        // 不再立即执行，等 WebSocket 连接后再触发
        pendingTasks.set(taskId, { recordId: record.id, inputText: fileText, location });
    } catch (err: any) {
        console.error('启动分析失败:', err);
        res.status(500).json({ error: '启动分析失败' });
    }
});

app.get('/api/analysis/result/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const recordId = parseInt(req.params.id);
        const userId = req.session.userId!;
        const result = await db.select().from(analysisHistory).where(eq(analysisHistory.id, recordId)).limit(1);
        if (result.length === 0 || result[0].userId !== userId) {
            return res.status(404).json({ error: '记录不存在' });
        }
        res.json({
            result: result[0].result,
            status: result[0].status,
            patientName: result[0].patientName,
            age: result[0].age,
            gender: result[0].gender,
            inputText: result[0].inputText,
            createdAt: result[0].createdAt,
        });
    } catch (err: any) {
        console.error('获取结果失败:', err);
        res.status(500).json({ error: '获取结果失败' });
    }
});

app.get('/api/analysis/history', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.session.userId!;
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = 20;
        const search = (req.query.search as string) || '';

        let query = db.select().from(analysisHistory).where(eq(analysisHistory.userId, userId));

        const records = await query.orderBy(desc(analysisHistory.createdAt)).limit(pageSize).offset((page - 1) * pageSize);

        const [totalResult] = await db.select({ count: sql<number>`count(*)` })
            .from(analysisHistory)
            .where(eq(analysisHistory.userId, userId));

        // 过滤搜索
        let filteredRecords = records;
        if (search) {
            const s = search.toLowerCase();
            filteredRecords = records.filter(r =>
                (r.patientName || '').toLowerCase().includes(s) ||
                (r.inputText || '').toLowerCase().includes(s)
            );
        }

        res.json({
            records: filteredRecords.map(r => ({
                id: r.id,
                patientName: r.patientName,
                age: r.age,
                gender: r.gender,
                status: r.status,
                createdAt: r.createdAt,
                inputText: r.inputText?.substring(0, 100),
            })),
            total: Number(totalResult?.count || 0),
            page,
            pageSize,
        });
    } catch (err: any) {
        console.error('获取历史记录失败:', err);
        res.status(500).json({ error: '获取历史记录失败' });
    }
});

app.delete('/api/analysis/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const recordId = parseInt(req.params.id);
        const userId = req.session.userId!;
        const result = await db.select().from(analysisHistory).where(eq(analysisHistory.id, recordId)).limit(1);
        if (result.length === 0 || result[0].userId !== userId) {
            return res.status(404).json({ error: '记录不存在' });
        }
        await db.delete(analysisHistory).where(eq(analysisHistory.id, recordId));
        res.json({ message: '已删除' });
    } catch (err: any) {
        console.error('删除失败:', err);
        res.status(500).json({ error: '删除失败' });
    }
});

// ==================== WebSocket ====================
wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const taskId = url.searchParams.get('taskId');

    if (taskId) {
        activeTasks.set(taskId, { ws });

        // WebSocket 连接后，立即触发分析
        const pending = pendingTasks.get(taskId);
        if (pending) {
            pendingTasks.delete(taskId);
            runAnalysis(taskId, pending.recordId, pending.inputText, pending.location).catch(console.error);
        }
    }

    ws.on('close', () => {
        if (taskId) {
            activeTasks.delete(taskId);
            pendingTasks.delete(taskId);
        }
    });
});

// 清理超时未连接的任务（30秒）
setInterval(() => {
    const now = Date.now();
    for (const [taskId, task] of pendingTasks) {
        const ts = parseInt(taskId.split('_')[1]);
        if (now - ts > 30000) {
            pendingTasks.delete(taskId);
            db.update(analysisHistory)
                .set({ status: 'failed', result: { error: 'WebSocket连接超时' } })
                .where(eq(analysisHistory.id, task.recordId))
                .execute()
                .catch(console.error);
        }
    }
}, 10000);

// ==================== 分析执行 ====================
async function runAnalysis(taskId: string, recordId: number, inputText: string, location?: { lat: number; lng: number }) {
    const task = activeTasks.get(taskId);
    const sendProgress = (progress: number, message: string) => {
        if (task && task.ws.readyState === WebSocket.OPEN) {
            task.ws.send(JSON.stringify({ progress: `${progress}%`, message, step: Math.round(progress / 25) }));
        }
    };

    try {
        sendProgress(5, '正在启动多智能体分析引擎...');
        await sleep(300);

        sendProgress(15, '智能体1/4：症状分析智能体正在分析...');
        const agentResults = await runMultiAgentAnalysis(inputText);
        sendProgress(40, '智能体2/4：检验报告解读智能体正在分析...');

        await sleep(200);
        sendProgress(65, '智能体3/4：风险评估智能体正在评估...');
        await sleep(200);
        sendProgress(85, '智能体4/4：治疗方案推荐智能体正在生成建议...');

        // 生成医院推荐
        const hospitalRecommendation = generateHospitalRecommendation(agentResults, location);

        // 合并结果
        const combinedResult = {
            agents: agentResults,
            hospitalRecommendation,
            summary: generateSummary(agentResults),
            timestamp: new Date().toISOString(),
            totalConfidence: Math.round(agentResults.reduce((sum, a) => sum + a.confidence, 0) / agentResults.length * 100),
        };

        sendProgress(100, '分析完成！正在生成综合报告...');

        await db.update(analysisHistory)
            .set({ result: combinedResult, status: 'completed' })
            .where(eq(analysisHistory.id, recordId));

        activeTasks.delete(taskId);
    } catch (err: any) {
        console.error('分析失败:', err);
        sendProgress(0, '分析失败');

        await db.update(analysisHistory)
            .set({ status: 'failed', result: { error: err.message } })
            .where(eq(analysisHistory.id, recordId));

        activeTasks.delete(taskId);
    }
}

function generateSummary(agentResults: any[]): string {
    const symptomAgent = agentResults.find(a => a.agent === '症状分析');
    const riskAgent = agentResults.find(a => a.agent === '风险评估');

    let summary = '综合分析已完成。';
    try {
        const symptomData = JSON.parse(symptomAgent?.content || '{}');
        const riskData = JSON.parse(riskAgent?.content || '{}');
        if (symptomData.urgency_level) summary = `紧急程度：${symptomData.urgency_level}。`;
        if (riskData.risk_level) summary += ` 风险等级：${riskData.risk_level}。`;
    } catch { }
    return summary;
}

function generateHospitalRecommendation(agentResults: any[], location?: { lat: number; lng: number }) {
    try {
        const symptomData = JSON.parse(agentResults[0]?.content || '{}');
        const riskData = JSON.parse(agentResults[2]?.content || '{}');
        const urgency = symptomData.urgency_level || '常规';
        const riskLevel = riskData.risk_level || '低风险';

        // 只有需要关注或紧急的情况才推荐医院
        const needsHospital = urgency === '紧急' || urgency === '需关注' || riskLevel.includes('中') || riskLevel.includes('高');

        if (!needsHospital) {
            return { needed: false, message: '当前症状暂不需要紧急就医，建议观察。' };
        }

        // 科室推荐
        let department = '内科';
        if (symptomData.primary_symptoms?.some((s: string) => s.includes('牙') || s.includes('口腔'))) department = '口腔科';
        else if (symptomData.primary_symptoms?.some((s: string) => s.includes('眼') || s.includes('视力'))) department = '眼科';
        else if (symptomData.primary_symptoms?.some((s: string) => s.includes('皮肤') || s.includes('痘') || s.includes('过敏'))) department = '皮肤科';
        else if (symptomData.primary_symptoms?.some((s: string) => s.includes('耳') || s.includes('鼻'))) department = '耳鼻喉科';
        else if (symptomData.primary_symptoms?.some((s: string) => s.includes('心') || s.includes('胸'))) department = '心血管内科';
        else if (symptomData.primary_symptoms?.some((s: string) => s.includes('胃') || s.includes('消化'))) department = '消化内科';
        else if (symptomData.primary_symptoms?.some((s: string) => s.includes('腰') || s.includes('背') || s.includes('关节'))) department = '骨科';
        else if (symptomData.primary_symptoms?.some((s: string) => s.includes('神经') || s.includes('头晕') || s.includes('头痛'))) department = '神经内科';

        // 模拟附近医院（基于位置或默认）
        const hospitals = [
            { name: '市第一人民医院', distance: location ? '约2.5公里' : '—', level: '三级甲等', dept: department, phone: '120', address: '市中心路88号' },
            { name: '市第二人民医院', distance: location ? '约3.8公里' : '—', level: '三级甲等', dept: department, phone: '120', address: '解放路156号' },
            { name: '市中心医院', distance: location ? '约5.1公里' : '—', level: '三级乙等', dept: department, phone: '120', address: '人民路200号' },
        ];

        return {
            needed: true,
            urgency,
            department,
            message: `根据分析结果，建议前往${department}就诊。以下是附近推荐医院：`,
            hospitals,
            hasLocation: !!location,
        };
    } catch {
        return { needed: false, message: '无法生成医院推荐。' };
    }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));