import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../services/project.service';
import type { Project } from '../types/api.types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';
import {
  FolderGit2,
  PlusCircle,
  Layers,
  ArrowRight,
  Calendar,
  RotateCw,
  Sparkles,
} from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-surface-elevated/70 to-slate-900/40 border border-indigo-500/20 shadow-xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderGit2 className="w-6 h-6 text-indigo-500" />
            Project Workspaces
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Organize queues and manage job namespaces per organizational project ({projects.length} workspaces)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchProjects} className="btn-secondary btn-sm flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 flex items-center gap-2 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Project</span>
          </Button>
        </div>
      </div>

      {/* Creation Modal */}
      {isCreating && (
        <Card className="border-indigo-500/40 bg-surface-elevated shadow-2xl p-6">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4 mb-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Create Project Workspace
            </h3>
            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm">
              ✕
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Project Title</label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. Analytics Pipeline"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Description (Optional)</label>
              <textarea
                className="input min-h-[90px]"
                placeholder="Briefly describe the workload and services in this project"
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
              <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                Create Workspace
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map(project => (
          <Link key={project.id} to={`/projects/${project.id}`} className="group">
            <div className="p-6 rounded-2xl bg-surface-elevated/90 border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 transition-all duration-300 shadow-md flex flex-col justify-between h-full group-hover:-translate-y-1">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    {project._count?.queues || 0} Queues
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                  {project.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-2 line-clamp-2 min-h-[34px]">
                  {project.description || 'General application queues and task processing.'}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-400 dark:text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-semibold">
                  Open Project
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}

        {projects.length === 0 && !isCreating && (
          <div className="col-span-full py-16 text-center bg-surface-elevated/40 rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
            <FolderGit2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No Projects Configured</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-4 max-w-sm mx-auto">
              Create your first project workspace to start organizing queues and jobs.
            </p>
            <Button onClick={() => setIsCreating(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              Create Project
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
