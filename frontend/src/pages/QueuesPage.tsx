import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { queueService } from '../services/queue.service';
import { projectService } from '../services/project.service';
import type { Queue, Project } from '../types/api.types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

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
      await queueService.createQueue(formData);
      setIsCreating(false);
      setFormData(prev => ({ ...prev, name: '', description: '' }));
      fetchQueues();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Queues</h1>
          <p className="text-gray-400 text-sm mt-1">Manage processing queues and limits</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>+ New Queue</Button>
      </div>

      {isCreating && (
        <Card className="mb-6 border-primary-500/50">
          <CardHeader title="Create New Queue" />
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Project</label>
                <select 
                  className="select" 
                  value={formData.projectId} 
                  onChange={e => setFormData({...formData, projectId: e.target.value})}
                  required
                >
                  <option value="">Select a project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Queue Name</label>
                <input type="text" required className="input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="label">Concurrency Limit (workers)</label>
                <input type="number" min="1" max="100" required className="input" value={formData.concurrencyLimit} onChange={e => setFormData({...formData, concurrencyLimit: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="label">Max Retries</label>
                <input type="number" min="0" max="20" required className="input" value={formData.maxRetries} onChange={e => setFormData({...formData, maxRetries: parseInt(e.target.value)})} />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <input type="text" className="input" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button type="submit">Create Queue</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {queues.map((queue) => (
          <Card key={queue.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary-500/30 transition-colors">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Link to={`/queues/${queue.id}`} className="text-lg font-semibold text-white hover:text-primary-400">
                  {queue.name}
                </Link>
                <Badge status={queue.status} />
              </div>
              <p className="text-sm text-gray-400">{queue.description || 'No description'}</p>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Concurrency: {queue.concurrencyLimit}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retries: {queue.maxRetries} ({queue.retryStrategy})
                </span>
                <span>Jobs: {queue._count?.jobs || 0}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link to={`/jobs?queueId=${queue.id}`}>
                <Button variant="secondary" size="sm">View Jobs</Button>
              </Link>
              <Link to={`/queues/${queue.id}`}>
                <Button size="sm">Manage</Button>
              </Link>
            </div>
          </Card>
        ))}
        {queues.length === 0 && !isCreating && (
          <div className="text-center py-12 bg-surface-elevated rounded-xl border border-dashed border-surface-border">
            <h3 className="text-white mb-2">No queues found</h3>
            <Button onClick={() => setIsCreating(true)}>Create Queue</Button>
          </div>
        )}
      </div>
    </div>
  );
}
