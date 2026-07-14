import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, desc, sql, and, or, ilike } from 'drizzle-orm';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { runMultiAgentAnalysis } from './services/gemini';
import { users, analysisHistory } from '../shared/schema';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'can0n-ai-dev-secret-key');
if (!sessionSecret) {
    throw new Error('SESSION_SECRET must be set in production');
}

app.set('trust proxy', 1);
app.use(express.json({ limit: '256kb' }));

const sessionMiddleware = session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production' ? ('auto' as any) : false,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
    },
});

app.use(sessionMiddleware);

server.on('upgrade', (req, socket, head) => {
    if (!req.url?.startsWith('/ws')) {
        socket.destroy();
        return;
    }

    const responseStub = {
        getHeader() { return undefined; },
        setHeader() { return undefined; },
        writeHead() { return undefined; },
    };

    sessionMiddleware(req as any, responseStub as any, () => {
        const sessionReq = req as any;
        if (!sessionReq.session?.userId) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    });
});

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

const registerSchema = z.object({
    username: z.string().trim().min(2, '用户名至少2位').max(32, '用户名不能超过32位'),
    email: z.union([z.string().trim().email('邮箱格式不正确').max(254), z.literal('')]).optional(),
    password: z.string().min(8, '密码至少8位').max(72, '密码不能超过72位'),
});

const loginSchema = z.object({
    username: z.string().trim().min(1, '请输入用户名').max(32),
    password: z.string().min(1, '请输入密码').max(72),
});

const analysisStartSchema = z.object({
    patientName: z.string().trim().max(80).optional(),
    age: z.union([z.string().trim().regex(/^\d{1,3}$/, '年龄格式不正确'), z.literal('')]).optional(),
    gender: z.enum(['男', '女', '其他']).optional().default('男'),
    fileText: z.string().trim().min(2, '请至少输入2个字符的症状描述').max(20000, '分析文本不能超过20000个字符'),
    analysisMode: z.enum(['quick', 'full']).optional().default('full'),
    location: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
    }).optional(),
});

function formatValidationError(error: z.ZodError) {
    return error.issues[0]?.message || '请求参数不正确';
}

// ==================== 认证路由 ====================
app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: formatValidationError(parsed.error) });
        const { username, email, password } = parsed.data;

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
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: formatValidationError(parsed.error) });
        const { username, password } = parsed.data;

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
const activeTasks = new Map<string, { ws: WebSocket; userId: number }>();
const pendingTasks = new Map<string, {
    recordId: number;
    userId: number;
    inputText: string;
    mode: 'quick' | 'full';
    createdAt: number;
    location?: { lat: number; lng: number };
}>();

app.post('/api/analysis/start', requireAuth, async (req: Request, res: Response) => {
    try {
        const parsed = analysisStartSchema.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: formatValidationError(parsed.error) });
        const { patientName, age, gender, fileText, analysisMode, location } = parsed.data;
        const userId = req.session.userId!;

        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const [record] = await db.insert(analysisHistory).values({
            userId, patientName: patientName || '', age: age || '', gender: gender || '',
            inputText: fileText, status: 'analyzing',
        }).returning();

        res.json({ taskId, recordId: record.id });
        // 不再立即执行，等 WebSocket 连接后再触发
        pendingTasks.set(taskId, { recordId: record.id, userId, inputText: fileText, mode: analysisMode, createdAt: Date.now(), location });
    } catch (err: any) {
        console.error('启动分析失败:', err);
        res.status(500).json({ error: '启动分析失败' });
    }
});

app.get('/api/analysis/result/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const recordId = parseInt(req.params.id);
        if (!Number.isInteger(recordId)) return res.status(400).json({ error: '记录ID不正确' });
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
        const page = Math.max(parseInt(req.query.page as string) || 1, 1);
        const pageSize = 20;
        const search = ((req.query.search as string) || '').trim();
        const searchCondition = search
            ? and(
                eq(analysisHistory.userId, userId),
                or(
                    ilike(analysisHistory.patientName, `%${search}%`),
                    ilike(analysisHistory.inputText, `%${search}%`),
                ),
            )
            : eq(analysisHistory.userId, userId);

        const records = await db.select().from(analysisHistory)
            .where(searchCondition)
            .orderBy(desc(analysisHistory.createdAt))
            .limit(pageSize)
            .offset((page - 1) * pageSize);

        const [totalResult] = await db.select({ count: sql<number>`count(*)` })
            .from(analysisHistory)
            .where(searchCondition);

        res.json({
            records: records.map(r => ({
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
        if (!Number.isInteger(recordId)) return res.status(400).json({ error: '记录ID不正确' });
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
    const sessionReq = req as any;
    const userId = sessionReq.session?.userId;

    if (taskId) {
        // WebSocket 连接后，立即触发分析
        const pending = pendingTasks.get(taskId);
        if (pending && pending.userId === userId) {
            activeTasks.set(taskId, { ws, userId: pending.userId });
            pendingTasks.delete(taskId);
            runAnalysis(taskId, pending.recordId, pending.inputText, pending.mode, pending.location).catch(console.error);
        } else {
            ws.close(1008, '任务不存在或已过期');
        }
    } else {
        ws.close(1008, '缺少任务ID');
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
        if (now - task.createdAt > 30000) {
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
async function runAnalysis(taskId: string, recordId: number, inputText: string, mode: 'quick' | 'full', location?: { lat: number; lng: number }) {
    const task = activeTasks.get(taskId);
    const sendProgress = (progress: number, message: string, step?: number) => {
        if (task && task.ws.readyState === WebSocket.OPEN) {
            task.ws.send(JSON.stringify({ progress: `${progress}%`, message, step: step ?? Math.round(progress / 25) }));
        }
    };

    try {
        sendProgress(5, '正在启动多智能体分析引擎...');
        await sleep(300);

        const agentResults = await runMultiAgentAnalysis(inputText, mode, (agent, index, total) => {
            const progress = Math.round(15 + ((index + 1) / total) * 70);
            sendProgress(progress, `智能体${index + 1}/${total}：${agent}已完成`, index + 1);
        });

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
        const symptomAgent = agentResults.find(a => a.agent === '症状分析');
        const riskAgent = agentResults.find(a => a.agent === '风险评估');
        const symptomData = JSON.parse(symptomAgent?.content || '{}');
        const riskData = JSON.parse(riskAgent?.content || '{}');
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

if (process.env.NODE_ENV === 'production') {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const clientDistPath = path.resolve(__dirname, '..', 'dist', 'client');

    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(clientDistPath, 'index.html'));
    });
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
