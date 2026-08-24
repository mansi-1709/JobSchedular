import React, { useEffect, useState } from 'react';
import { StatCard } from '../components/dashboard/StatCard';
import { metricsService } from '../services/metrics.service';
import type { Metrics } from '../types/api.types';
import { useMetricsUpdate } from '../context/SocketContext';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { Link } from 'react-router-dom';
import { Card, CardHeader } from '../components/ui/Card';

export function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const data = await metricsService.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useMetricsUpdate((newMetrics) => {
    setMetrics(newMetrics);
  });

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <button onClick={fetchMetrics} className="btn-secondary btn-sm">Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Jobs" value={metrics.summary.total} />
        <StatCard title="Queued Jobs" value={metrics.summary.queued} />
        <StatCard title="Running Jobs" value={metrics.summary.running} />
        <StatCard title="Completed Jobs" value={metrics.summary.completed} />
        <StatCard title="Failed Jobs" value={metrics.summary.failed} trend="down" trendLabel="Needs Attention" />
        <StatCard title="Dead Letter Jobs" value={metrics.summary.deadLetter} trend="down" trendLabel="Unresolved" />
        <StatCard title="Active Workers" value={metrics.summary.activeWorkers} trend="up" trendLabel="Online" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Queue Status" />
          <div className="space-y-4">
            {metrics.queueStats.map((q) => (
              <div key={q.queueId} className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-surface-border">
                <div>
                  <h4 className="font-medium text-white">{q.name}</h4>
                  <div className="text-xs text-gray-400 mt-1 flex gap-3">
                    <span>Total: {q.total}</span>
                    <span>Running: {q.running}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge status="COMPLETED">{q.completed}</Badge>
                  <Badge status="FAILED">{q.failed}</Badge>
                </div>
              </div>
            ))}
            {metrics.queueStats.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No queues found. Create one in Projects.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent Failures" action={<Link to="/jobs?status=FAILED" className="text-xs text-primary-400 hover:text-primary-300">View All</Link>} />
          <div className="space-y-3">
            {metrics.recentFailures.map((job) => (
              <div key={job.id} className="p-3 rounded-lg bg-red-950/20 border border-red-900/30 flex justify-between items-center">
                <div>
                  <Link to={`/jobs/${job.id}`} className="font-medium text-red-200 hover:text-red-100">{job.name}</Link>
                  <p className="text-xs text-gray-400 mt-1">Queue: {job.queue?.name} • Attempt {job.currentAttempt}</p>
                </div>
                <Badge status={job.status} />
              </div>
            ))}
            {metrics.recentFailures.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <svg className="w-12 h-12 mx-auto text-emerald-500/50 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No recent failures. Everything is running smoothly!</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
