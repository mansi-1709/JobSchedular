import React, { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  FolderGit2,
  Layers,
  Cpu,
  Server,
  Activity,
  AlertOctagon,
  LogOut,
  Zap,
  Radio,
  Sun,
  Moon,
} from 'lucide-react';

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderGit2 },
    { name: 'Queues', path: '/queues', icon: Layers },
    { name: 'Jobs Explorer', path: '/jobs', icon: Cpu },
    { name: 'Workers', path: '/workers', icon: Server },
    { name: 'Metrics & Analytics', path: '/metrics', icon: Activity },
    { name: 'Dead Letter Queue', path: '/dlq', icon: AlertOctagon },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#080912] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 glass-elevated border-r border-slate-200 dark:border-indigo-950/40 flex flex-col z-20 shadow-2xl">
        <div className="p-5 border-b border-slate-200 dark:border-indigo-950/40 bg-gradient-to-b from-indigo-50/50 dark:from-indigo-950/30 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-indigo-950 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-indigo-200 dark:via-purple-200 dark:to-pink-200">
                  JobScheduler
                </h1>
                <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[120px]" title={user?.organization?.name || 'Organization'}>
                  {user?.organization?.name || 'Acme Corporation'}
                </p>
              </div>
            </div>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-2 rounded-xl bg-slate-200/70 dark:bg-white/5 hover:bg-slate-300/80 dark:hover:bg-white/10 text-slate-700 dark:text-indigo-300 transition-all duration-200 border border-slate-300 dark:border-white/10 shadow-sm"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-fade-in" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 animate-fade-in" />
              )}
            </button>
          </div>

          {/* Live Sync Status */}
          <div className="mt-3.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-indigo-950/50 border border-slate-200 dark:border-indigo-900/30">
            <span className="text-[11px] font-medium text-slate-600 dark:text-gray-400 flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${connected ? 'text-emerald-500 animate-pulse' : 'text-rose-500'}`} />
              WebSocket Sync
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              connected 
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' 
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
            }`}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? 'text-white bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-600/30 font-semibold'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User profile & sign out */}
        <div className="p-4 border-t border-slate-200 dark:border-indigo-950/40 bg-gradient-to-t from-slate-100 dark:from-black/40 to-transparent">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md border border-indigo-400/20">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/50 dark:bg-gradient-to-br dark:from-[#0a0a18] dark:via-[#0d0d22] dark:to-[#070714] transition-colors duration-300">
        {/* Background ambient lighting in dark mode */}
        <div className="hidden dark:block absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="hidden dark:block absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none transform -translate-x-1/3 translate-y-1/3"></div>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
