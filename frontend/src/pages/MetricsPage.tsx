import React, { useEffect, useState } from 'react';
import { metricsService } from '../services/metrics.service';
import type { Metrics } from '../types/api.types';
import { Spinner } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  Activity,
  RotateCw,
  TrendingUp,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Server,
  ShieldCheck,
  Percent,
} from 'lucide-react';

export function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    setRefreshing(true);
    try {
      const data = await metricsService.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!metrics) return null;

  // Compute summary KPI values
  const totalProcessed = (metrics.summary.completed || 0) + (metrics.summary.failed || 0) + (metrics.summary.deadLetter || 0);
  const successRate = totalProcessed > 0
    ? ((metrics.summary.completed / totalProcessed) * 100).toFixed(1)
    : '100.0';

  // Format throughput chart to ensure at least 6 hourly points for nice spline visualization
  const formattedChartData = (() => {
    if (!metrics.throughputChart || metrics.throughputChart.length === 0) return [];
    if (metrics.throughputChart.length >= 6) return metrics.throughputChart;

    // Pad prior hours if we have only 1-2 points to create a beautiful continuous timeline
    const latest = new Date(metrics.throughputChart[metrics.throughputChart.length - 1].hour);
    const padded = [];
    for (let i = 5; i >= 0; i--) {
      const targetTime = new Date(latest.getTime() - i * 60 * 60 * 1000);
      const existing = metrics.throughputChart.find(p => new Date(p.hour).getHours() === targetTime.getHours());
      if (existing) {
        padded.push(existing);
      } else {
        padded.push({
          hour: targetTime.toISOString(),
          completed: 0,
          failed: 0,
          avgDuration: 0,
        });
      }
    }
    return padded;
  })();

  const isDark = true;
  const gridColor = '#1e2238';
  const textColor = '#94a3b8';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-surface-elevated/70 to-slate-900/40 border border-indigo-500/20 shadow-xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-500" />
            Performance & Analytics Telemetry
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Real-time throughput metrics, latency percentiles, and queue load distributions
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={refreshing}
          className="btn-secondary btn-sm flex items-center gap-1.5"
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface-elevated/80 border border-emerald-500/20 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">Success Rate</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><Percent className="w-4 h-4" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{successRate}%</span>
            <span className="text-xs font-semibold text-emerald-500">SLA Target 99.5%</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-elevated/80 border border-indigo-500/20 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">Total Ingested</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500"><Zap className="w-4 h-4" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{metrics.summary.total}</span>
            <span className="text-xs font-semibold text-indigo-500">{metrics.summary.running} in-flight</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-elevated/80 border border-cyan-500/20 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">Avg Latency</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500"><Clock className="w-4 h-4" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {metrics.throughputChart[metrics.throughputChart.length - 1]?.avgDuration || 0}
              <span className="text-sm font-normal text-slate-400 ml-1">ms</span>
            </span>
            <span className="text-xs font-semibold text-cyan-500">Execution time</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-elevated/80 border border-purple-500/20 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">Worker Fleet</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500"><Server className="w-4 h-4" /></div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{metrics.summary.activeWorkers}</span>
            <span className="text-xs font-semibold text-purple-500">Online Daemons</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Throughput Chart */}
        <Card className="h-[430px] flex flex-col p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Hourly Job Throughput
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Execution volume across hourly timeline</p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompletedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFailedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="hour"
                  stroke={textColor}
                  fontSize={11}
                  tickFormatter={val => `${new Date(val).getHours()}:00`}
                />
                <YAxis stroke={textColor} fontSize={11} />
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f1020' : '#ffffff',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#cbd5e1',
                    borderRadius: '12px',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  }}
                  labelFormatter={val => new Date(val).toLocaleString()}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCompletedGrad)"
                  name="Completed Workloads"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFailedGrad)"
                  name="Failed / Retrying"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Queue Workload Distribution */}
        <Card className="h-[430px] flex flex-col p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-500" />
                Queue Workload Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Execution volume breakdown per configured queue</p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.queueStats} barSize={32} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="barCompletedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="barRunningGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                  <linearGradient id="barFailedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke={textColor} fontSize={11} />
                <YAxis stroke={textColor} fontSize={11} />
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f1020' : '#ffffff',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#cbd5e1',
                    borderRadius: '12px',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="completed" stackId="a" fill="url(#barCompletedGrad)" name="Completed" radius={[0, 0, 6, 6]} />
                <Bar dataKey="running" stackId="a" fill="url(#barRunningGrad)" name="Running" />
                <Bar dataKey="failed" stackId="a" fill="url(#barFailedGrad)" name="Failed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Latency & Processing Duration */}
        <Card className="h-[400px] flex flex-col p-6 shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-500" />
                Average Processing Latency (ms)
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Mean execution duration per hour across worker daemons</p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedChartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDurationGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="hour"
                  stroke={textColor}
                  fontSize={11}
                  tickFormatter={val => `${new Date(val).getHours()}:00`}
                />
                <YAxis stroke={textColor} fontSize={11} />
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f1020' : '#ffffff',
                    borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : '#cbd5e1',
                    borderRadius: '12px',
                    color: isDark ? '#ffffff' : '#0f172a',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  }}
                  labelFormatter={val => new Date(val).toLocaleString()}
                />
                <Area
                  type="monotone"
                  dataKey="avgDuration"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorDurationGrad)"
                  name="Mean Duration (ms)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
