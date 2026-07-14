import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Stats {
    totalAnalyses: number;
    completedAnalyses: number;
    successRate: number;
    recentRecords: { id: number; patientName: string; status: string; createdAt: string }[];
}

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard/stats')
            .then(res => res.json())
            .then(setStats)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const statCards = [
        { label: '总分析次数', value: stats?.totalAnalyses ?? 0, icon: '📊', gradient: 'card-gradient-blue', color: 'text-blue-600', delay: 'delay-0' },
        { label: '已完成分析', value: stats?.completedAnalyses ?? 0, icon: '✅', gradient: 'card-gradient-green', color: 'text-emerald-600', delay: 'delay-100' },
        { label: '成功率', value: `${stats?.successRate ?? 0}%`, icon: '🎯', gradient: 'card-gradient-purple', color: 'text-purple-600', delay: 'delay-200' },
        { label: '在线智能体', value: '5', icon: '🤖', gradient: 'card-gradient-amber', color: 'text-amber-600', delay: 'delay-300' },
    ];

    return (
        <div className="p-6 lg:p-8 fade-in">
            {/* 顶部欢迎 */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">
                    欢迎回来，{user?.username}
                </h1>
                <p className="text-gray-500 mt-1">以下是您的分析概览和最近活动</p>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card, i) => (
                    <div
                        key={i}
                        className={`${card.gradient} rounded-xl p-5 shadow-sm cursor-pointer transform transition-all duration-300 hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] ${card.delay}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl transition-transform duration-300 hover:scale-125 inline-block">{card.icon}</span>
                        </div>
                        <p className={`text-3xl font-bold ${card.color} transition-all duration-300`}>
                            {loading ? <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" /> : card.value}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* 快速操作 + 最近记录 */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* 快速操作 */}
                <div className="glass-card p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">快速操作</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => navigate('/analysis')}
                            className="flex flex-col items-center gap-2 p-4 bg-blue-50/70 backdrop-blur rounded-xl hover:bg-blue-100/80 transition-all duration-300 group hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🧠</span>
                            <span className="text-sm font-medium text-blue-700">全面分析</span>
                            <span className="text-[10px] text-blue-400">4智能体协作</span>
                        </button>
                        <button
                            onClick={() => navigate('/history')}
                            className="flex flex-col items-center gap-2 p-4 bg-purple-50/70 backdrop-blur rounded-xl hover:bg-purple-100/80 transition-all duration-300 group hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform duration-300">📋</span>
                            <span className="text-sm font-medium text-purple-700">历史记录</span>
                            <span className="text-[10px] text-purple-400">查看/导出</span>
                        </button>
                        <button
                            onClick={() => navigate('/analysis?mode=lab')}
                            className="flex flex-col items-center gap-2 p-4 bg-emerald-50/70 backdrop-blur rounded-xl hover:bg-emerald-100/80 transition-all duration-300 group hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🔬</span>
                            <span className="text-sm font-medium text-emerald-700">检验解读</span>
                            <span className="text-[10px] text-emerald-400">化验单分析</span>
                        </button>
                        <button
                            onClick={() => navigate('/analysis?mode=risk')}
                            className="flex flex-col items-center gap-2 p-4 bg-amber-50/70 backdrop-blur rounded-xl hover:bg-amber-100/80 transition-all duration-300 group hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                        >
                            <span className="text-3xl group-hover:scale-110 transition-transform duration-300">⚠️</span>
                            <span className="text-sm font-medium text-amber-700">风险评估</span>
                            <span className="text-[10px] text-amber-400">疾病筛查</span>
                        </button>
                    </div>
                </div>

                {/* 最近记录 */}
                <div className="glass-card p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800">最近分析</h2>
                        <button onClick={() => navigate('/history')} className="text-sm text-blue-600 hover:underline transition-colors">
                            查看全部
                        </button>
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
                            ))}
                        </div>
                    ) : (stats?.recentRecords?.length ?? 0) === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <span className="text-4xl block mb-2">📭</span>
                            <p>暂无分析记录</p>
                            <button onClick={() => navigate('/analysis')} className="text-blue-600 text-sm mt-2 hover:underline transition-colors">
                                开始第一次分析
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {stats?.recentRecords?.map(record => (
                                <div
                                    key={record.id}
                                    onClick={() => navigate(`/history?highlight=${record.id}`)}
                                    className="flex items-center justify-between p-3 hover:bg-gray-50/80 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-sm hover:translate-x-1 active:scale-[0.99]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full transition-all ${record.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'}`} />
                                        <span className="font-medium text-gray-700 text-sm">
                                            {record.patientName || '未命名'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}