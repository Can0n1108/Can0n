import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const agentInfo = [
    { name: '症状分析', icon: '🔍', desc: '分析患者症状，给出初步诊断方向', color: 'blue', colorHex: '#3b82f6' },
    { name: '检验解读', icon: '🔬', desc: '解读实验室检查和影像学发现', color: 'emerald', colorHex: '#10b981' },
    { name: '风险评估', icon: '⚠️', desc: '全面评估患者健康风险等级', color: 'amber', colorHex: '#f59e0b' },
    { name: '治疗建议', icon: '💊', desc: '给出治疗建议和后续随访方案', color: 'purple', colorHex: '#8b5cf6' },
];

const sampleCases = [
    { label: '呼吸道感染', text: '患者男，45岁，发热38.5℃，咳嗽咳痰3天，伴有咽痛，无呼吸困难。血常规：白细胞12.5×10⁹/L，中性粒细胞比例82%。' },
    { label: '心血管风险', text: '患者男，58岁，BMI 28.5，有高血压病史10年，近期血压160/95mmHg，总胆固醇6.8mmol/L，LDL 4.2mmol/L，偶有胸闷。' },
    { label: '糖尿病管理', text: '患者女，52岁，2型糖尿病5年，空腹血糖9.2mmol/L，HbA1c 8.1%，近期出现手脚麻木，视力模糊。' },
    { label: '消化系统', text: '患者男，35岁，上腹部疼痛伴反酸烧心2周，进食后加重，胃镜提示：胃窦部黏膜充血水肿，幽门螺杆菌阳性。' },
];

export default function AnalysisPage() {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [patient, setPatient] = useState({ name: '', age: '', gender: '男' });
    const [text, setText] = useState('');
    const [analysisMode, setAnalysisMode] = useState<'quick' | 'full'>('full');
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'completed' | 'failed'>('idle');
    const [progress, setProgress] = useState(0);
    const [progressMsg, setProgressMsg] = useState('');
    const [currentStep, setCurrentStep] = useState(0);
    const [currentCase, setCurrentCase] = useState(0);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        const qmode = searchParams.get('mode');
        if (qmode === 'lab') {
            setAnalysisMode('quick');
            setText('请粘贴检验报告数据：\n\n检验项目 / 结果 / 参考范围 / 单位\n-----------------------------------\n');
        } else if (qmode === 'risk') {
            setAnalysisMode('quick');
            setText('请描述患者风险因素：\n\n年龄 / 性别 / 既往史 / 家族史 / 生活习惯\n');
        }
    }, []);

    const connectWS = (taskId: string, recordId: number) => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws?taskId=${taskId}`);
        wsRef.current = ws;
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const pct = parseInt(data.progress);
            setProgress(pct);
            setProgressMsg(data.message);
            setCurrentStep(data.step || 0);
            if (pct >= 100) { setStatus('completed'); addToast('分析完成！正在跳转报告页...', 'success'); setTimeout(() => navigate(`/report/${recordId}`), 500); }
        };
        ws.onerror = () => { setStatus('failed'); addToast('分析连接中断，请重试', 'error'); };
    };

    const handleSubmit = async () => {
        if (!text.trim()) { addToast('请输入患者信息或病历文本', 'warning'); return; }
        setStatus('analyzing'); setProgress(0); setCurrentStep(0);
        setProgressMsg('正在启动多智能体分析引擎...');

        // 尝试获取定位
        let location: { lat: number; lng: number } | undefined;
        try {
            if ('geolocation' in navigator) {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 600000 });
                });
                location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            }
        } catch { /* 定位失败不影响分析 */ }

        try {
            const res = await fetch('/api/analysis/start', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientName: patient.name || '未命名', age: patient.age, gender: patient.gender, fileText: text, location }),
            });
            const data = await res.json();
            if (data.taskId) { connectWS(data.taskId, data.recordId); }
            else { setStatus('failed'); addToast('启动分析失败', 'error'); }
        } catch { setStatus('failed'); addToast('网络请求失败', 'error'); }
    };

    useEffect(() => { return () => { wsRef.current?.close(); }; }, []);

    // 示例病例自动滚动
    useEffect(() => {
        if (status !== 'idle') return;
        const timer = setInterval(() => {
            setCurrentCase(prev => (prev + 1) % sampleCases.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [status]);

    return (
        <div className="p-6 lg:p-8 fade-in">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">智能分析</h1>
                <p className="text-gray-500 text-sm">多智能体协作，提供全方位医疗分析</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* 左侧：输入面板 */}
                <div className="space-y-4">
                    <div className="glass-card p-5">
                        <h2 className="font-bold text-gray-800 mb-3">患者信息</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white/60 backdrop-blur focus:ring-2 focus:ring-blue-500 outline-none" placeholder="姓名" value={patient.name} onChange={e => setPatient(p => ({ ...p, name: e.target.value }))} />
                            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white/60 backdrop-blur focus:ring-2 focus:ring-blue-500 outline-none" placeholder="年龄" value={patient.age} onChange={e => setPatient(p => ({ ...p, age: e.target.value }))} />
                        </div>
                        <div className="mt-3">
                            <label className="block text-xs text-gray-500 mb-1.5">性别</label>
                            <div className="flex rounded-lg overflow-hidden border border-gray-200">
                                <button
                                    onClick={() => setPatient(p => ({ ...p, gender: '男' }))}
                                    className={`flex-1 py-2 text-sm font-medium transition-all ${patient.gender === '男' ? 'bg-blue-600 text-white' : 'bg-white/60 text-gray-600 hover:bg-gray-50'}`}
                                >♂ 男</button>
                                <button
                                    onClick={() => setPatient(p => ({ ...p, gender: '女' }))}
                                    className={`flex-1 py-2 text-sm font-medium transition-all ${patient.gender === '女' ? 'bg-pink-500 text-white' : 'bg-white/60 text-gray-600 hover:bg-gray-50'}`}
                                >♀ 女</button>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-5">
                        <h2 className="font-bold text-gray-800 mb-4">分析模式</h2>
                        <div className="flex gap-2">
                            <button onClick={() => setAnalysisMode('full')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${analysisMode === 'full' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white/60 backdrop-blur text-gray-600 hover:bg-white/80'}`}>全面分析</button>
                            <button onClick={() => setAnalysisMode('quick')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${analysisMode === 'quick' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white/60 backdrop-blur text-gray-600 hover:bg-white/80'}`}>快速筛查</button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{analysisMode === 'full' ? '4个智能体完整协作，提供详细报告' : '快速评估核心风险，给出关键建议'}</p>
                    </div>

                    <div className="glass-card p-5">
                        <h2 className="font-bold text-gray-800 mb-3">示例病例</h2>
                        <div className="relative overflow-hidden rounded-lg" style={{ height: '88px' }}>
                            {sampleCases.map((c, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setText(c.text); setPatient(prev => ({ ...prev, name: c.label })); addToast(`已加载示例：${c.label}`, 'info'); }}
                                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all duration-500 absolute inset-0 ${
                                        i === currentCase
                                            ? 'opacity-100 translate-x-0 bg-blue-50/80 border border-blue-200'
                                            : 'opacity-0 translate-x-full pointer-events-none'
                                    }`}
                                >
                                    <span className="font-medium block mb-0.5 text-blue-700">{['🔍', '❤️', '🩸', '🫗'][i]} {c.label}</span>
                                    <span className="text-gray-600">{c.text.substring(0, 55)}...</span>
                                </button>
                            ))}
                        </div>
                        {/* 导航点 */}
                        <div className="flex justify-center gap-1.5 mt-2">
                            {sampleCases.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentCase(i)}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                        i === currentCase ? 'bg-blue-600 w-4' : 'bg-gray-300 hover:bg-gray-400'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* 右侧：分析区 */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="glass-card p-5">
                        <textarea
                            className="w-full border border-gray-200 rounded-lg p-4 h-40 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white/60 backdrop-blur"
                            placeholder="请粘贴患者的病历文本、检查报告、症状描述或实验室数据..."
                            value={text} onChange={e => setText(e.target.value)}
                        />
                        <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-400">{text.length} 字符</span>
                            <button
                                onClick={handleSubmit}
                                disabled={status === 'analyzing'}
                                className={`px-6 py-2.5 rounded-lg text-white font-medium text-sm transition-all ${
                                    status === 'analyzing' ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5'
                                }`}
                            >
                                {status === 'analyzing' ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        分析中...
                                    </span>
                                ) : '启动多智能体分析'}
                            </button>
                        </div>
                    </div>

                    {/* 线性时间线进度 */}
                    {status === 'analyzing' && (
                        <div className="glass-card p-6 slide-up">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-sm font-medium text-gray-700">{progressMsg}</span>
                                <span className="text-sm font-mono text-blue-600 font-bold">{progress}%</span>
                            </div>

                            {/* 线性进度条 */}
                            <div className="w-full bg-gray-200/50 rounded-full h-2 mb-6 overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                            </div>

                            {/* 时间线节点 */}
                            <div className="relative">
                                <div className="absolute left-0 top-6 w-full h-0.5 bg-gray-200" />
                                <div className="absolute left-0 top-6 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out" style={{ width: `${Math.min(progress, 100)}%` }} />
                                <div className="relative flex justify-between">
                                    {agentInfo.map((agent, i) => {
                                        const isCompleted = i < currentStep;
                                        const isActive = i === currentStep;
                                        const isPending = i > currentStep;
                                        return (
                                            <div key={i} className="flex flex-col items-center gap-2 z-10">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all duration-500 ${
                                                    isCompleted ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-300 timeline-dot' :
                                                    isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-300 timeline-active scale-110' :
                                                    'bg-gray-100 text-gray-300'
                                                }`}>
                                                    {agent.icon}
                                                </div>
                                                <span className={`text-[10px] font-medium transition-colors ${
                                                    isCompleted ? 'text-blue-600' : isActive ? 'text-blue-600 font-bold' : 'text-gray-300'
                                                }`}>{agent.name}</span>
                                                {isCompleted && <span className="text-[10px] text-emerald-500">✓ 完成</span>}
                                                {isActive && <span className="text-[10px] text-blue-500 animate-pulse">分析中...</span>}
                                                {isPending && <span className="text-[10px] text-gray-300">等待</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div className="glass-card p-5">
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
                                <span className="font-medium">分析失败</span>，请检查网络连接或后端服务状态，然后重试。
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}