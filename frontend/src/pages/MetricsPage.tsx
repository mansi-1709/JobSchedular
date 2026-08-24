import React, { useEffect, useState } from 'react';
import { metricsService } from '../services/metrics.service';
import type { Metrics } from '../types/api.types';
import { Spinner } from '../components/ui/Spinner';
import { Card, CardHeader } from '../components/ui/Card';
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-surface-elevated/70 to-slate-900/60 border border-surface-border shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-400" />
            Performance & Analytics Telemetry
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time throughput metrics, latency percentiles, and queue load distributions
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={refreshing}
          className="btn-secondary btn-sm flex items-center gap-1.5"
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Throughput Chart */}
        <Card className="h-[420px] flex flex-col p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Hourly Job Throughput
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Completed vs Failed jobs across 24h timeline</p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.throughputChart} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="hour"
                  stroke="#4b5563"
                  fontSize={11}
                  tickFormatter={val => `${new Date(val).getHours()}:00`}
                />
                <YAxis stroke="#4b5563" fontSize={11} />
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c0d1b',
                    borderColor: 'rgba(99, 102, 241, 0.25)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  labelFormatter={val => new Date(val).toLocaleString()}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  name="Completed Workloads"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFailed)"
                  name="Failed / Retrying"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Queue Load Distribution */}
        <Card className="h-[420px] flex flex-col p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                Queue Workload Distribution
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Execution volume breakdown per configured queue</p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.queueStats} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#4b5563" fontSize={11} />
                <YAxis stroke="#4b5563" fontSize={11} />
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c0d1b',
                    borderColor: 'rgba(99, 102, 241, 0.25)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" radius={[0, 0, 4, 4]} />
                <Bar dataKey="running" stackId="a" fill="#6366f1" name="Running" />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Latency & Processing Duration */}
        <Card className="h-[400px] flex flex-col p-6 shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Average Processing Latency (ms)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Mean execution duration per hour across worker daemons</p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.throughputChart} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="hour"
                  stroke="#4b5563"
                  fontSize={11}
                  tickFormatter={val => `${new Date(val).getHours()}:00`}
                />
                <YAxis stroke="#4b5563" fontSize={11} />
                <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0c0d1b',
                    borderColor: 'rgba(99, 102, 241, 0.25)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  labelFormatter={val => new Date(val).toLocaleString()}
                />
                <Area
                  type="monotone"
                  dataKey="avgDuration"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDuration)"
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
