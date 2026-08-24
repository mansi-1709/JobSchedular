import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { jobService } from '../services/job.service';
import { queueService } from '../services/queue.service';
import type { Job, Queue } from '../types/api.types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useJobUpdate } from '../context/SocketContext';
import {
  Cpu,
  PlusCircle,
  Search,
  Filter,
  Layers,
  Clock,
  RotateCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const page = parseInt(searchParams.get('page') || '1', 10);
  const status = searchParams.get('status') || '';
  const queueId = searchParams.get('queueId') || '';

  const [formData, setFormData] = useState({
    queueId: queueId || '',
    name: '',
    payloadStr: '{\n  "durationMs": 1500,\n  "failureRate": 0.0\n}',
    jobType: 'IMMEDIATE',
    cronExpression: '*/5 * * * *',
    scheduledAt: '',
    priority: 0,
  });

  const fetchJobs = async () => {
    try {
      const data = await jobService.getJobs({
        page,
        status,
        queueId,
        search: searchQuery || undefined,
        limit: 15,
      });
      setJobs(data.jobs);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const qData = await queueService.getQueues();
        setQueues(qData);
        if (qData.length > 0 && !formData.queueId && !queueId) {
          setFormData(prev => ({ ...prev, queueId: qData[0].id }));
        }
        await fetchJobs();
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    init();
  }, [page, status, queueId]);

  // Live real-time socket updates
  useJobUpdate((updatedJob) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === updatedJob.id ? { ...j, ...updatedJob } : j))
    );
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let payload = {};
      try {
        payload = JSON.parse(formData.payloadStr);
      } catch {
        alert('Invalid JSON in payload.');
        return;
      }

      await jobService.createJob({
        queueId: formData.queueId,
        name: formData.name,
        payload,
        jobType: formData.jobType as any,
        priority: Number(formData.priority) || 0,
        cronExpression: formData.jobType === 'RECURRING' ? formData.cronExpression : undefined,
        scheduledAt: formData.jobType === 'DELAYED' && formData.scheduledAt ? formData.scheduledAt : undefined,
      });

      setIsCreating(false);
      setFormData(prev => ({ ...prev, name: '' }));
      fetchJobs();
    } catch (err) {
      console.error(err);
      alert('Failed to dispatch job. Check parameters.');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  const statusFilters = [
    { label: 'All', value: '' },
    { label: 'Queued', value: 'QUEUED' },
    { label: 'Running', value: 'RUNNING' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Failed', value: 'FAILED' },
    { label: 'Dead Letter', value: 'DEAD_LETTER' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-indigo-400" />
            Jobs Explorer
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time asynchronous job inspector & execution lifecycle telemetry ({total} total jobs)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            className="btn-secondary btn-sm flex items-center gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Job</span>
          </Button>
        </div>
      </div>

      {/* Creation Modal / Form */}
      {isCreating && (
        <Card className="border-indigo-500/40 bg-gradient-to-b from-indigo-950/40 to-surface/90 shadow-2xl p-6">
          <div className="flex items-center justify-between border-b border-surface-border pb-4 mb-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Dispatch New Background Job
            </h3>
            <button
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Target Queue</label>
                <select
                  className="select"
                  value={formData.queueId}
                  onChange={e => setFormData({ ...formData, queueId: e.target.value })}
                  required
                >
                  {queues.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.name} (Priority: {q.priority})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Job Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Generate Sales Invoices"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Execution Type</label>
                <select
                  className="select"
                  value={formData.jobType}
                  onChange={e => setFormData({ ...formData, jobType: e.target.value })}
                >
                  <option value="IMMEDIATE">Immediate Execution</option>
                  <option value="DELAYED">Delayed (Specific Time)</option>
                  <option value="RECURRING">Recurring (Cron Schedule)</option>
                </select>
              </div>
            </div>

            {formData.jobType === 'RECURRING' && (
              <div>
                <label className="label">Cron Expression (e.g. */10 * * * * for every 10 mins)</label>
                <input
                  type="text"
                  className="input font-mono"
                  value={formData.cronExpression}
                  onChange={e => setFormData({ ...formData, cronExpression: e.target.value })}
                  required
                />
              </div>
            )}

            {formData.jobType === 'DELAYED' && (
              <div>
                <label className="label">Scheduled Execution Timestamp</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={formData.scheduledAt}
                  onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                  required
                />
              </div>
            )}

            <div>
              <label className="label">Payload JSON Data</label>
              <textarea
                className="input font-mono text-xs min-h-[100px]"
                value={formData.payloadStr}
                onChange={e => setFormData({ ...formData, payloadStr: e.target.value })}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Custom execution parameters passed directly to the worker process.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-surface-border">
              <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                Dispatch to Fleet
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter Bar & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 glass rounded-2xl border border-surface-border">
        {/* Status Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {statusFilters.map(sf => (
            <button
              key={sf.value}
              onClick={() => handleFilterChange('status', sf.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                status === sf.value
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>

        {/* Queue Dropdown Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-400" />
            <select
              className="select text-xs py-1.5 px-3 min-w-[150px]"
              value={queueId}
              onChange={e => handleFilterChange('queueId', e.target.value)}
            >
              <option value="">All Queues</option>
              {queues.map(q => (
                <option key={q.id} value={q.id}>
                  {q.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="table-container shadow-xl">
          <table>
            <thead>
              <tr>
                <th>Job Identifier</th>
                <th>Status</th>
                <th>Queue</th>
                <th>Type</th>
                <th>Attempts</th>
                <th>Submitted</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} className="group">
                  <td className="font-semibold">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-indigo-200 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                    >
                      <span>{job.name}</span>
                    </Link>
                    <span className="text-[11px] font-mono text-gray-500 block truncate max-w-[220px]">
                      {job.id}
                    </span>
                  </td>
                  <td>
                    <Badge status={job.status} />
                  </td>
                  <td>
                    <span className="text-xs font-medium text-gray-300 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      {job.queue?.name || 'Default'}
                    </span>
                  </td>
                  <td>
                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/10">
                      {job.jobType}
                    </span>
                  </td>
                  <td>
                    <span className="text-xs text-gray-300 font-medium">
                      {job.currentAttempt} / {job.maxRetries}
                    </span>
                  </td>
                  <td className="text-xs text-gray-400">
                    {new Date(job.createdAt).toLocaleTimeString()} ({new Date(job.createdAt).toLocaleDateString()})
                  </td>
                  <td className="text-right">
                    <Link to={`/jobs/${job.id}`}>
                      <Button variant="secondary" size="sm" className="group-hover:border-indigo-500/50">
                        <ExternalLink className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                        Inspect
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobs.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Cpu className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="font-medium text-gray-300">No jobs found in this view.</p>
              <p className="text-xs text-gray-500 mt-1">Try changing status filters or dispatch a new job.</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex justify-between items-center pt-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => handleFilterChange('page', (page - 1).toString())}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </Button>
        <span className="text-xs font-semibold text-gray-400">
          Page {page} of {Math.max(1, Math.ceil(total / 15))}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={jobs.length < 15}
          onClick={() => handleFilterChange('page', (page + 1).toString())}
          className="flex items-center gap-1"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
