import React, { ReactNode } from 'react';

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  color = 'indigo',
}: {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'purple' | 'cyan';
}) {
  const colorMap = {
    indigo: 'from-indigo-500/10 to-indigo-500/0 border-indigo-500/20 text-indigo-400',
    emerald: 'from-emerald-500/10 to-emerald-500/0 border-emerald-500/20 text-emerald-400',
    rose: 'from-rose-500/10 to-rose-500/0 border-rose-500/20 text-rose-400',
    amber: 'from-amber-500/10 to-amber-500/0 border-amber-500/20 text-amber-400',
    purple: 'from-purple-500/10 to-purple-500/0 border-purple-500/20 text-purple-400',
    cyan: 'from-cyan-500/10 to-cyan-500/0 border-cyan-500/20 text-cyan-400',
  };

  return (
    <div className={`p-5 rounded-2xl bg-gradient-to-b ${colorMap[color]} bg-surface-elevated/70 border backdrop-blur-xl shadow-lg hover:border-opacity-50 transition-all duration-300 group hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 group-hover:text-gray-300 transition-colors">
          {title}
        </h3>
        {icon && (
          <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white shadow-inner">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-3xl font-extrabold text-white tracking-tight">{value}</span>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              trend === 'up'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : trend === 'down'
                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}
