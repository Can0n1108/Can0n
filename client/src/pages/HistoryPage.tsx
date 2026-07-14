import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

interface HistoryRecord {
    id: number;
    patientName: string;
    age: string;
    gender: string;
    status: string;
    createdAt: string;
    inputText: string;
}

export default function HistoryPage() {
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [records, setRecords] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const pageSize = 20;
    const [deleteTarget, setDeleteTarget] = useState<HistoryRecord | null>(null);
    const [deleting, setDeleting] = useState(false);

    const loadRecords = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analysis/history?page=${page}&search=${encodeURIComponent(search)}`);
            const data = await res.json();
            setRecords(data.records || []);
            setTotal(data.total || 0);
        } catch {
            addToast('加载历史记录失败', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadRecords(); }, [page, search]);

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/analysis/${deleteTarget.id}`, { method: 'DELETE' });
            if (res.ok) {
                addToast('记录已删除', 'success');
                loadRecords();
            }
        } catch {
            addToast('删除失败', 'error');
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="p-6 lg:p-8 fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">历史记录</h1>
                    <p className="text-gray-500 text-sm">查看和管理所有分析记录</p>
                </div>
            </div>

            <div className="glass-card p-4 mb-4 flex gap-3">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input type="text" className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white/60 backdrop-blur" placeholder="搜索患者姓名或病历内容..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-3">{[1, 2, 3, 4, 5].map(i => (<div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />))}</div>
                ) : records.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <span className="text-5xl block mb-3">📭</span>
                        <p className="text-lg">暂无分析记录</p>
                        <p className="text-sm mt-1">开始一次智能分析后，记录将显示在这里</p>
                    </div>
                ) : (
                    <div>
                        {records.map(record => (
                            <div key={record.id} className="flex items-center justify-between p-4 hover:bg-blue-50/50 border-b border-gray-100 last:border-b-0 transition-colors">
                                <div className="flex-1 cursor-pointer min-w-0" onClick={() => navigate(`/report/${record.id}`)}>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${record.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        <span className="font-medium text-gray-800 truncate">{record.patientName || '未命名患者'}</span>
                                        <span className="text-xs text-gray-400">{record.age}岁 / {record.gender}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 truncate ml-5">{record.inputText}</p>
                                </div>
                                <div className="flex items-center gap-4 ml-4 shrink-0">
                                    <span className="text-xs text-gray-400">{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
                                    <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(record); }} className="text-gray-400 hover:text-red-500 transition-colors text-sm p-1.5 hover:bg-red-50 rounded-lg" title="删除">🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">上一页</button>
                    <span className="text-sm text-gray-500 px-3">{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">下一页</button>
                </div>
            )}

            {/* 删除确认弹窗 */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDeleteTarget(null)}>
                    {/* 背景遮罩 */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" />
                    {/* 弹窗内容 */}
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 animate-[slideUp_0.3s_ease-out] overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* 顶部危险标识 */}
                        <div className="bg-gradient-to-r from-red-500 to-rose-500 p-5 text-center">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-3xl">⚠️</span>
                            </div>
                            <h3 className="text-white font-bold text-lg">确认删除</h3>
                        </div>
                        {/* 内容 */}
                        <div className="p-6">
                            <p className="text-gray-600 text-sm text-center leading-relaxed">
                                确定要删除患者 <span className="font-semibold text-gray-800">"{deleteTarget.patientName || '未命名'}"</span> 的分析记录吗？
                            </p>
                            <p className="text-xs text-red-500 text-center mt-2 bg-red-50 py-1.5 rounded-lg">
                                此操作不可撤销
                            </p>
                            {/* 按钮 */}
                            <div className="flex gap-3 mt-5">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 active:scale-95"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleting}
                                    className="flex-1 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 shadow-lg shadow-red-200"
                                >
                                    {deleting ? (
                                        <span className="flex items-center justify-center gap-1.5">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            删除中...
                                        </span>
                                    ) : '确认删除'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}