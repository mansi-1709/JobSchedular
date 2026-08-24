import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../services/project.service';
import type { Project } from '../types/api.types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card, CardHeader } from '../components/ui/Card';

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const fetchProjects = async () => {
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await projectService.createProject(newProjectName, newProjectDesc);
      setNewProjectName('');
      setNewProjectDesc('');
      setIsCreating(false);
      fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your job scheduling projects</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>+ New Project</Button>
      </div>

      {isCreating && (
        <Card className="mb-6 border-primary-500/50 shadow-lg shadow-primary-900/20">
          <CardHeader title="Create New Project" />
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Project Name</label>
              <input type="text" required className="input" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea className="input min-h-[80px]" value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button type="submit">Create Project</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link key={project.id} to={`/projects/${project.id}`}>
            <Card className="h-full hover:glow-border transition-all duration-300 cursor-pointer">
              <h3 className="text-lg font-semibold text-white mb-2">{project.name}</h3>
              <p className="text-sm text-gray-400 mb-6 line-clamp-2 min-h-[40px]">
                {project.description || 'No description provided.'}
              </p>
              <div className="flex justify-between items-center text-xs text-gray-500 border-t border-surface-border pt-4">
                <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1 bg-surface-elevated px-2 py-1 rounded-md text-gray-300 border border-surface-border">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  {project._count?.queues || 0} Queues
                </span>
              </div>
            </Card>
          </Link>
        ))}

        {projects.length === 0 && !isCreating && (
          <div className="col-span-full py-12 text-center bg-surface-elevated rounded-xl border border-dashed border-surface-border">
            <h3 className="text-lg font-medium text-white mb-2">No projects found</h3>
            <p className="text-gray-400 mb-4">Create your first project to start organizing queues.</p>
            <Button onClick={() => setIsCreating(true)}>Create Project</Button>
          </div>
        )}
      </div>
    </div>
  );
}
