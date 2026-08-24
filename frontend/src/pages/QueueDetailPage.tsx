import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { queueService } from '../services/queue.service';
import type { Queue } from '../types/api.types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card, CardHeader } from '../components/ui/Card';
import { StatCard } from '../components/dashboard/StatCard';
import { Badge } from '../components/ui/Badge';

export function QueueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    if (!id) return;
    try {
      const data = await queueService.getQueueById(id);
      setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [id]);

  const togglePause = async () => {
    if (!queue) return;
    try {
      if (queue.status === 'ACTIVE') {
        await queueService.pauseQueue(queue.id);
      } else {
        await queueService.resumeQueue(queue.id);
      }
      fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!queue || !confirm('Are you sure you want to delete this queue? All its jobs will be lost!')) return;
    try {
      await queueService.deleteQueue(queue.id);
      navigate(`/projects/${queue.projectId}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;
  if (!queue) return <div className="text-center py-10 text-red-400">Queue not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Link to={`/projects/${queue.projectId}`} className="hover:text-white transition-colors">Project</Link>
            <span>/</span>
            <Link to="/queues" className="hover:text-white transition-colors">Queues</Link>
            <span>/</span>
            <span className="text-white">{queue.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{queue.name}</h1>
            <Badge status={queue.status} />
          </div>
          <p className="text-gray-400 mt-1">{queue.description || 'No description'}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={queue.status === 'ACTIVE' ? 'secondary' : 'primary'} 
            onClick={togglePause}
          >
            {queue.status === 'ACTIVE' ? 'Pause Queue' : 'Resume Queue'}
          </Button>
          <Link to={`/jobs?queueId=${queue.id}`}>
            <Button>View Jobs</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Jobs" value={queue.stats?.total || 0} />
        <StatCard title="Queued" value={queue.stats?.queued || 0} />
        <StatCard title="Running" value={queue.stats?.running || 0} />
        <StatCard title="Completed" value={queue.stats?.completed || 0} />
        <StatCard title="Failed" value={queue.stats?.failed || 0} trend="down" />
        <StatCard title="DLQ" value={queue.stats?.deadLetter || 0} trend="down" />
        <StatCard title="Throughput (1h)" value={queue.stats?.throughput || 0} trend="up" />
        <StatCard title="Total Retries" value={queue.stats?.retryCount || 0} />
      </div>

      <Card>
        <CardHeader title="Queue Configuration" action={<Button variant="secondary" size="sm" className="opacity-50 cursor-not-allowed">Edit (Coming soon)</Button>} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
          <div className="flex justify-between py-2 border-b border-surface-border/50">
            <span className="text-gray-400">Concurrency Limit</span>
            <span className="font-medium text-white">{queue.concurrencyLimit} workers</span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-border/50">
            <span className="text-gray-400">Priority</span>
            <span className="font-medium text-white">{queue.priority}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-border/50">
            <span className="text-gray-400">Retry Strategy</span>
            <span className="font-medium text-white">{queue.retryStrategy}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-border/50">
            <span className="text-gray-400">Max Retries</span>
            <span className="font-medium text-white">{queue.maxRetries}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-border/50">
            <span className="text-gray-400">Base Retry Delay</span>
            <span className="font-medium text-white">{queue.retryDelayMs} ms</span>
          </div>
          <div className="flex justify-between py-2 border-b border-surface-border/50">
            <span className="text-gray-400">Created At</span>
            <span className="font-medium text-white">{new Date(queue.createdAt).toLocaleString()}</span>
          </div>
        </div>
      </Card>

      <div className="pt-8 border-t border-red-900/30 flex justify-end">
        <Button variant="danger" onClick={handleDelete}>Delete Queue</Button>
      </div>
    </div>
  );
}
