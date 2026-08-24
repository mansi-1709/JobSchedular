import React, { useEffect, useState } from 'react';
import { StatCard } from '../components/dashboard/StatCard';
import { metricsService } from '../services/metrics.service';
import type { Metrics } from '../types/api.types';
import { useMetricsUpdate } from '../context/SocketContext';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { Link } from 'react-router-dom';
import { Card, CardHeader } from '../components/ui/Card';
import {
  RotateCw,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';

export function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    setRefreshing(true);
    try {
      const data = await metricsService.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch metrics', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useMetricsUpdate((newMetrics) => {
    setMetrics(newMetrics);
  });

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-surface-elevated/70 to-slate-900/40 border border-indigo-500/20 shadow-xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            System Operations Control Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-300/80 mt-1">
            Real-time telemetry, asynchronous worker fleet monitoring, and queue throughput.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchMetrics}
            disabled={refreshing}
            className="btn-secondary btn-sm flex items-center gap-2"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link
            to="/jobs"
            className="btn-primary btn-sm flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Job</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Jobs Ingested" value={metrics.summary.total} color="indigo" />
        <StatCard title="Queued (Pending Execution)" value={metrics.summary.queued} color="amber" />
        <StatCard title="Active Running Jobs" value={metrics.summary.running} trend="up" trendLabel="In Flight" color="purple" />
        <StatCard title="Successfully Completed" value={metrics.summary.completed} trend="up" trendLabel="Processed" color="emerald" />
        <StatCard title="Failed Retrying Jobs" value={metrics.summary.failed} trend="down" trendLabel="Auto-Retrying" color="rose" />
        <StatCard title="Dead Letter Queue" value={metrics.summary.deadLetter} trend="down" trendLabel="Permanent Failures" color="rose" />
        <StatCard title="Active Worker Nodes" value={metrics.summary.activeWorkers} trend="up" trendLabel="Online" color="cyan" />
      </div>

      {/* Queue Health & Failures Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Queues Card */}
        <Card>
          <CardHeader
            title="Queue Concurrency & Workload"
            action={
              <Link to="/queues" className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 flex items-center gap-1">
                <span>Manage Queues</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          <div className="space-y-3 mt-4">
            {metrics.queueStats.map((q) => (
              <div
                key={q.queueId}
                className="p-4 rounded-xl bg-surface-elevated/70 border border-slate-200 dark:border-white/10 hover:border-indigo-500/40 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{q.name}</h4>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-gray-400 mt-1.5 flex gap-4">
                    <span>Total: <strong className="text-slate-700 dark:text-gray-200">{q.total}</strong></span>
                    <span>Running: <strong className="text-indigo-600 dark:text-indigo-300">{q.running}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    {q.completed} Completed
                  </span>
                  {q.failed > 0 && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                      {q.failed} Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
            {metrics.queueStats.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Layers className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="text-sm">No queues configured yet. Create a queue in Projects.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Failures & DLQ Alert Card */}
        <Card>
          <CardHeader
            title="Dead Letter & Recent Incident Log"
            action={
              <Link to="/dlq" className="text-xs font-semibold text-rose-500 hover:text-rose-400 flex items-center gap-1">
                <span>View DLQ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          <div className="space-y-3 mt-4">
            {metrics.recentFailures.map((job) => (
              <div
                key={job.id}
                className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-all duration-200 flex justify-between items-center gap-3"
              >
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <Link to={`/jobs/${job.id}`} className="font-semibold text-sm text-slate-800 dark:text-rose-200 hover:text-rose-600 dark:hover:text-rose-100 truncate">
                      {job.name}
                    </Link>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 truncate">
                    Queue: {job.queue?.name || 'Default'} • Attempt {job.currentAttempt}/{job.maxRetries}
                  </p>
                </div>
                <Badge status={job.status} />
              </div>
            ))}
            {metrics.recentFailures.length === 0 && (
              <div className="text-center py-10 text-gray-400 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/60 mb-3 animate-pulse" />
                <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">Zero active system incidents.</p>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">All background workloads are executing within SLA thresholds.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
