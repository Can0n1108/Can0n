import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ParticleBackground from './ParticleBackground';

const navItems = [
    { path: '/', label: '仪表盘', icon: '📊', end: true },
    { path: '/analysis', label: '智能分析', icon: '🧠' },
    { path: '/history', label: '历史记录', icon: '📋' },
];

export default function Layout() {
    const { user, logout } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    const handleLogout = async () => {
        await logout();
        addToast('已安全退出', 'info');
        navigate('/login');
    };

    return (
        <div className="flex h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 50%, #f0e6ff 100%)' }}>
            <ParticleBackground />

            {/* 侧边栏 - 毛玻璃 */}
            <aside className={`${collapsed ? 'w-16' : 'w-60'} glass-strong flex flex-col transition-all duration-300 shrink-0 z-10 rounded-r-2xl`}>
                <div className="p-4 border-b border-white/50 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg shadow-red-500/30">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    </div>
                    {!collapsed && <span className="font-bold text-gray-800 text-lg">Can0nAI</span>}
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-blue-500/15 text-blue-700 shadow-sm'
                                        : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
                                }`
                            }
                        >
                            <span className="text-lg shrink-0">{item.icon}</span>
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3 border-t border-white/50">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{user?.username}</p>
                                <p className="text-xs text-gray-400">在线</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full mt-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50/70 rounded-lg transition-colors text-left"
                    >
                        {collapsed ? '🚪' : '退出登录'}
                    </button>
                </div>

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 transition-colors text-xs"
                >
                    {collapsed ? '▶' : '◀'}
                </button>
            </aside>

            {/* 主内容区 */}
            <main className="flex-1 overflow-auto relative z-10">
                <Outlet />
            </main>
        </div>
    );
}