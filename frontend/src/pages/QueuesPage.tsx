import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { queueService } from '../services/queue.service';
import { projectService } from '../services/project.service';
import type { Queue, Project } from '../types/api.types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Layers,
  PlusCircle,
  Zap,
  Repeat,
  FolderGit2,
  Settings,
  ExternalLink,
  RotateCw,
  Cpu,
} from 'lucide-react';

export function QueuesPage() {
  const [searchParams] = useSearchParams();
  const projectIdParam = searchParams.get('projectId');

  const [queues, setQueues] = useState<Queue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    projectId: projectIdParam || '',
    name: '',
    description: '',
    concurrencyLimit: 5,
    maxRetries: 3,
    priority: 0,
    retryStrategy: 'EXPONENTIAL',
  });

  const fetchQueues = async () => {
    try {
      const data = await queueService.getQueues(projectIdParam || undefined);
      setQueues(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const pData = await projectService.getProjects();
        setProjects(pData);
        if (pData.length > 0 && !formData.projectId) {
          setFormData(prev => ({ ...prev, projectId: pData[0].id }));
        }
        await fetchQueues();
      } catch (err) {
        console.error(err);
      }
    };
    fetchInit();
  }, [projectIdParam]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await queueService.createQueue(formData as any);
      setIsCreating(false);
      setFormData(prev => ({ ...prev, name: '', description: '' }));
      fetchQueues();
    } catch (err) {
      console.error(err);
      alert('Failed to create queue.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-indigo-400" />
            Queue Infrastructure
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure concurrency limits, retry backoff algorithms, and priority dispatching ({queues.length} active queues)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchQueues} className="btn-secondary btn-sm flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Queue</span>
          </Button>
        </div>
      </div>

      {/* Creation Modal / Card */}
      {isCreating && (
        <Card className="border-indigo-500/40 bg-gradient-to-b from-indigo-950/40 to-surface/90 shadow-2xl p-6">
          <div className="flex items-center justify-between border-b border-surface-border pb-4 mb-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              Configure New Processing Queue
            </h3>
            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-white text-sm">
              ✕
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Parent Project</label>
                <select
                  className="select"
                  value={formData.projectId}
                  onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                  required
                >
                  <option value="">Select project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Queue Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. video-rendering"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Priority (Higher = Claimed First)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Concurrency Limit (Simultaneous Workers)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  className="input"
                  value={formData.concurrencyLimit}
                  onChange={e => setFormData({ ...formData, concurrencyLimit: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="label">Max Retries</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  required
                  className="input"
                  value={formData.maxRetries}
                  onChange={e => setFormData({ ...formData, maxRetries: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="label">Retry Backoff Strategy</label>
                <select
                  className="select"
                  value={formData.retryStrategy}
                  onChange={e => setFormData({ ...formData, retryStrategy: e.target.value })}
                >
                  <option value="EXPONENTIAL">Exponential Backoff</option>
                  <option value="LINEAR">Linear Backoff</option>
                  <option value="FIXED">Fixed Interval</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Description / Workload Purpose</label>
              <input
                type="text"
                className="input"
                placeholder="Optional description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
              <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                Create Queue
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Queues List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {queues.map(queue => (
          <div
            key={queue.id}
            className="p-5 rounded-2xl bg-surface-elevated/70 border border-surface-border hover:border-indigo-500/40 transition-all duration-300 shadow-lg flex flex-col justify-between group hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge status={queue.status} />
                <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-800/40">
                  Priority: {queue.priority}
                </span>
              </div>

              <Link to={`/queues/${queue.id}`}>
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {queue.name}
                </h3>
              </Link>
              <p className="text-xs text-gray-400 mt-1 min-h-[32px] line-clamp-2">
                {queue.description || 'General async task processing pipeline.'}
              </p>

              {/* Specs Grid */}
              <div className="mt-4 pt-4 border-t border-surface-border/50 grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 text-gray-300">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>
                    Limit: <strong className="text-white">{queue.concurrencyLimit}</strong> workers
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Repeat className="w-4 h-4 text-amber-400" />
                  <span>
                    Retries: <strong className="text-white">{queue.maxRetries}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-surface-border/50 flex items-center justify-between gap-2">
              <Link to={`/jobs?queueId=${queue.id}`} className="flex-1">
                <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-1.5 text-xs">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>View Jobs</span>
                </Button>
              </Link>
              <Link to={`/queues/${queue.id}`} className="flex-1">
                <Button size="sm" className="w-full flex items-center justify-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {queues.length === 0 && !isCreating && (
        <div className="text-center py-16 bg-surface-elevated/40 rounded-2xl border border-dashed border-surface-border">
          <Layers className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <h3 className="text-white font-bold mb-1">No queues configured</h3>
          <p className="text-xs text-gray-400 mb-4">Create your first processing queue to begin routing background jobs.</p>
          <Button onClick={() => setIsCreating(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            Create Queue
          </Button>
        </div>
      )}
    </div>
  );
}
