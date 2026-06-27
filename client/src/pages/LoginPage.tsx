import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
    const { login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState<'username' | 'password' | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.username, form.password);
            addToast('登录成功，欢迎回来！', 'success');
            navigate('/');
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
            {/* 动态粒子背景 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-[128px] animate-[float_8s_ease-in-out_infinite]" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-400/20 rounded-full blur-[128px] animate-[float_10s_ease-in-out_infinite_2s]" />
                <div className="absolute top-2/3 left-1/2 w-64 h-64 bg-cyan-400/15 rounded-full blur-[96px] animate-[float_7s_ease-in-out_infinite_1s]" />
                <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-indigo-400/15 rounded-full blur-[96px] animate-[float_9s_ease-in-out_infinite_3s]" />
                {/* 网格线 */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }} />
            </div>

            {/* 左侧品牌区 */}
            <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative z-10">
                <div className="max-w-md">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mb-8 border border-white/20 shadow-2xl animate-[float_6s_ease-in-out_infinite]">
                        <span className="text-5xl">🧬</span>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
                        Can0nAI
                    </h1>
                    <p className="text-blue-200/80 text-lg leading-relaxed mb-2">
                        智能医疗分析平台
                    </p>
                    <p className="text-blue-300/50 text-sm leading-relaxed">
                        基于多智能体协作的AI医疗辅助诊断系统。
                        集成症状分析、检验解读、风险评估、治疗建议，
                        为临床决策提供全方位支持。
                    </p>
                    <div className="mt-10 flex gap-3">
                        {[
                            { label: '多智能体协作', icon: '🤖' },
                            { label: '实时分析', icon: '⚡' },
                            { label: '数据安全', icon: '🔒' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-default">
                                <span className="text-sm">{item.icon}</span>
                                <span className="text-xs text-blue-200/70">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 右侧登录表单 - 毛玻璃 */}
            <div className="flex-1 flex items-center justify-center p-8 relative z-10">
                <div className="w-full max-w-md">
                    {/* 毛玻璃卡片 */}
                    <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl shadow-black/20 animate-[slideUp_0.5s_ease-out]">
                        {/* 移动端logo */}
                        <div className="lg:hidden text-center mb-6">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
                                <span className="text-3xl">🧬</span>
                            </div>
                            <h1 className="text-2xl font-bold text-white">Can0nAI</h1>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-1">欢迎回来</h2>
                        <p className="text-blue-200/50 mb-8 text-sm">请登录您的账户以继续使用</p>

                        {error && (
                            <div className="bg-red-500/10 backdrop-blur border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm animate-[fadeIn_0.3s_ease]">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-blue-200/70 mb-2">用户名</label>
                                <div className={`relative rounded-xl transition-all duration-300 ${focused === 'username' ? 'ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/10' : 'ring-1 ring-white/10'}`}>
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">👤</span>
                                    <input
                                        type="text"
                                        className="w-full bg-white text-gray-800 border-0 rounded-xl pl-10 pr-4 py-3 placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-400/60"
                                        placeholder="请输入用户名"
                                        value={form.username}
                                        onChange={e => setForm({ ...form, username: e.target.value })}
                                        onFocus={() => setFocused('username')}
                                        onBlur={() => setFocused(null)}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-blue-200/70 mb-2">密码</label>
                                <div className={`relative rounded-xl transition-all duration-300 ${focused === 'password' ? 'ring-2 ring-blue-400/50 shadow-lg shadow-blue-500/10' : 'ring-1 ring-white/10'}`}>
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔑</span>
                                    <input
                                        type="password"
                                        className="w-full bg-white text-gray-800 border-0 rounded-xl pl-10 pr-4 py-3 placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-blue-400/60"
                                        placeholder="请输入密码"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        onFocus={() => setFocused('password')}
                                        onBlur={() => setFocused(null)}
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold py-3.5 rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 transition-all duration-300 shadow-lg shadow-blue-500/25 active:scale-[0.98] group"
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2 relative z-10">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        登录中...
                                    </span>
                                ) : (
                                    <span className="relative z-10">登 录</span>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-white/5">
                            <p className="text-center text-sm text-blue-200/40">
                                还没有账户？{' '}
                                <Link to="/register" className="text-blue-400 font-medium hover:text-blue-300 transition-colors underline underline-offset-4 decoration-blue-400/30 hover:decoration-blue-300/60">
                                    立即注册
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* 底部提示 */}
                    <p className="text-center text-blue-300/20 text-xs mt-6">
                        Can0nAI · 智能医疗辅助诊断系统 v1.0
                    </p>
                </div>
            </div>
        </div>
    );
}