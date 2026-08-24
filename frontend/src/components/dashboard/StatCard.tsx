import React, { ReactNode } from 'react';

export function StatCard({ title, value, icon, trend, trendLabel }: { title: string; value: string | number; icon?: ReactNode; trend?: 'up' | 'down' | 'neutral'; trendLabel?: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {icon && <div className="text-primary-400">{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white">{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}
