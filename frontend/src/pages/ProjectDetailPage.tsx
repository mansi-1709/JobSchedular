import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { projectService } from '../services/project.service';
import type { Project } from '../types/api.types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card, CardHeader } from '../components/ui/Card';
import { StatCard } from '../components/dashboard/StatCard';
import { Badge } from '../components/ui/Badge';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [projData, statsData] = await Promise.all([
          projectService.getProjectById(id),
          import('../services/api').then(m => m.default.get(`/projects/${id}/stats`)),
        ]);
        setProject(projData);
        setStats(statsData.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this project? All queues and jobs will be lost.')) return;
    try {
      await projectService.deleteProject(id);
      navigate('/projects');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;
  if (!project) return <div className="text-center py-10 text-red-400">Project not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Link to="/projects" className="hover:text-white transition-colors">Projects</Link>
            <span>/</span>
            <span className="text-white">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{project.name}</h1>
          <p className="text-gray-400 mt-1">{project.description || 'No description'}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/queues?projectId=${project.id}`}>
            <Button variant="secondary">View All Queues</Button>
          </Link>
          <Button variant="danger" onClick={handleDelete}>Delete Project</Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Jobs" value={stats.total} />
          <StatCard title="Queued" value={stats.queued} />
          <StatCard title="Running" value={stats.running} />
          <StatCard title="Completed" value={stats.completed} />
        </div>
      )}

      <Card>
        <CardHeader 
          title="Queues" 
          subtitle="Message queues within this project"
        />
        <div className="space-y-3">
          {project.queues?.map((queue) => (
            <div key={queue.id} className="flex items-center justify-between p-4 rounded-lg bg-surface-elevated border border-surface-border hover:border-primary-500/50 transition-colors">
              <div>
                <Link to={`/queues/${queue.id}`} className="text-lg font-medium text-white hover:text-primary-400">
                  {queue.name}
                </Link>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-4">
                  <span>Concurrency: {queue.concurrencyLimit}</span>
                  <span>Retries: {queue.maxRetries} ({queue.retryStrategy})</span>
                  <span>Jobs: {queue._count?.jobs || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge status={queue.status} />
                <Link to={`/queues/${queue.id}`}>
                  <Button variant="secondary" size="sm">Manage</Button>
                </Link>
              </div>
            </div>
          ))}
          {(!project.queues || project.queues.length === 0) && (
            <div className="text-center py-6 text-gray-400 border border-dashed border-surface-border rounded-lg">
              No queues in this project yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
