import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RegisterPage() {
    const { register } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirm) {
            setError('两次输入的密码不一致');
            return;
        }
        if (form.password.length < 8) {
            setError('密码至少需要8位');
            return;
        }

        setLoading(true);
        try {
            await register(form.username, form.email, form.password);
            addToast('注册成功，欢迎加入！', 'success');
            navigate('/');
        } catch (err: any) {
            setError(err.message);
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex relative overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-900">
            {/* 动态粒子背景 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-400/20 rounded-full blur-[128px] animate-[float_8s_ease-in-out_infinite]" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-400/20 rounded-full blur-[128px] animate-[float_10s_ease-in-out_infinite_2s]" />
                <div className="absolute top-2/3 left-1/2 w-64 h-64 bg-cyan-400/15 rounded-full blur-[96px] animate-[float_7s_ease-in-out_infinite_1s]" />
                <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-green-400/15 rounded-full blur-[96px] animate-[float_9s_ease-in-out_infinite_3s]" />
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }} />
            </div>

            {/* 左侧品牌区 */}
            <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative z-10">
                <div className="max-w-md">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mb-8 border border-white/20 shadow-2xl animate-[float_6s_ease-in-out_infinite]">
                        <span className="text-5xl">🚀</span>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
                        开始您的旅程
                    </h1>
                    <p className="text-emerald-200/80 text-lg leading-relaxed mb-2">
                        智能医疗之旅
                    </p>
                    <p className="text-emerald-300/50 text-sm leading-relaxed">
                        创建账户即可使用全部功能：多智能体分析、历史记录追踪、
                        智能报告生成、风险评估等专业医疗AI工具。
                    </p>
                    <div className="mt-10 space-y-3">
                        {[
                            { label: '免费注册，立即使用', icon: '✓' },
                            { label: '安全的账户管理', icon: '✓' },
                            { label: '完整的历史记录追踪', icon: '✓' },
                            { label: '多维度智能分析报告', icon: '✓' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-default">
                                <span className="text-emerald-400 text-sm">{item.icon}</span>
                                <span className="text-sm text-emerald-200/70">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 右侧注册表单 - 毛玻璃 */}
            <div className="flex-1 flex items-center justify-center p-8 relative z-10">
                <div className="w-full max-w-md">
                    <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl shadow-black/20 animate-[slideUp_0.5s_ease-out]">
                        <div className="lg:hidden text-center mb-6">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
                                <span className="text-3xl">🚀</span>
                            </div>
                            <h1 className="text-2xl font-bold text-white">创建账户</h1>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-1">创建新账户</h2>
                        <p className="text-emerald-200/50 mb-8 text-sm">填写以下信息完成注册</p>

                        {error && (
                            <div className="bg-red-500/10 backdrop-blur border border-red-500/20 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm animate-[fadeIn_0.3s_ease]">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-emerald-200/70 mb-2">用户名 *</label>
                                <div className={`relative rounded-xl transition-all duration-300 ${focused === 'username' ? 'ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/10' : 'ring-1 ring-white/10'}`}>
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">👤</span>
                                    <input
                                        type="text"
                                        className="w-full bg-white text-gray-800 border-0 rounded-xl pl-10 pr-4 py-3 placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-emerald-400/60"
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
                                <label className="block text-sm font-medium text-emerald-200/70 mb-2">邮箱（选填）</label>
                                <div className={`relative rounded-xl transition-all duration-300 ${focused === 'email' ? 'ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/10' : 'ring-1 ring-white/10'}`}>
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📧</span>
                                    <input
                                        type="email"
                                        className="w-full bg-white text-gray-800 border-0 rounded-xl pl-10 pr-4 py-3 placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-emerald-400/60"
                                        placeholder="请输入邮箱"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        onFocus={() => setFocused('email')}
                                        onBlur={() => setFocused(null)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-emerald-200/70 mb-2">密码 *</label>
                                <div className={`relative rounded-xl transition-all duration-300 ${focused === 'password' ? 'ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/10' : 'ring-1 ring-white/10'}`}>
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔑</span>
                                    <input
                                        type="password"
                                        className="w-full bg-white text-gray-800 border-0 rounded-xl pl-10 pr-4 py-3 placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-emerald-400/60"
                                        placeholder="至少8位密码"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        onFocus={() => setFocused('password')}
                                        onBlur={() => setFocused(null)}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-emerald-200/70 mb-2">确认密码 *</label>
                                <div className={`relative rounded-xl transition-all duration-300 ${focused === 'confirm' ? 'ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/10' : 'ring-1 ring-white/10'}`}>
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔑</span>
                                    <input
                                        type="password"
                                        className="w-full bg-white text-gray-800 border-0 rounded-xl pl-10 pr-4 py-3 placeholder-gray-400 outline-none transition-all duration-300 focus:ring-2 focus:ring-emerald-400/60"
                                        placeholder="再次输入密码"
                                        value={form.confirm}
                                        onChange={e => setForm({ ...form, confirm: e.target.value })}
                                        onFocus={() => setFocused('confirm')}
                                        onBlur={() => setFocused(null)}
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold py-3.5 rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 transition-all duration-300 shadow-lg shadow-emerald-500/25 active:scale-[0.98] group"
                            >
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2 relative z-10">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        注册中...
                                    </span>
                                ) : (
                                    <span className="relative z-10">创建账户</span>
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-6 border-t border-white/5">
                            <p className="text-center text-sm text-emerald-200/40">
                                已有账户？{' '}
                                <Link to="/login" className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors underline underline-offset-4 decoration-emerald-400/30 hover:decoration-emerald-300/60">
                                    立即登录
                                </Link>
                            </p>
                        </div>
                    </div>

                    <p className="text-center text-emerald-300/20 text-xs mt-6">
                        Can0nAI · 智能医疗辅助诊断系统 v1.0
                    </p>
                </div>
            </div>
        </div>
    );
}