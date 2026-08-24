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

export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const status = searchParams.get('status') || '';
  const queueId = searchParams.get('queueId') || '';

  const [formData, setFormData] = useState({
    queueId: queueId || '',
    name: '',
    payloadStr: '{\n  "durationMs": 2000,\n  "failureRate": 0.2\n}',
    jobType: 'IMMEDIATE',
  });

  const fetchJobs = async () => {
    try {
      const data = await jobService.getJobs({
        page,
        status,
        queueId,
        limit: 20,
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

  // Real-time updates
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
      } catch (e) {
        alert('Invalid JSON in payload');
        return;
      }

      await jobService.createJob({
        ...formData,
        payload,
      });
      setIsCreating(false);
      setFormData(prev => ({ ...prev, name: '' }));
      fetchJobs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1'); // reset page
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs Explorer</h1>
          <p className="text-gray-400 text-sm mt-1">Total {total} jobs found</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>+ Create Job</Button>
      </div>

      {isCreating && (
        <Card className="mb-6 border-primary-500/50">
          <h3 className="text-lg font-semibold text-white mb-4">Create New Job</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Queue</label>
                <select className="select" value={formData.queueId} onChange={e => setFormData({...formData, queueId: e.target.value})} required>
                  {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Job Name</label>
                <input type="text" required className="input" placeholder="e.g. Process Image #123" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="label">Job Type</label>
                <select className="select" value={formData.jobType} onChange={e => setFormData({...formData, jobType: e.target.value})}>
                  <option value="IMMEDIATE">Immediate</option>
                  <option value="DELAYED">Delayed (not fully supported in demo UI)</option>
                  <option value="RECURRING">Recurring (not fully supported in demo UI)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Payload (JSON)</label>
              <textarea 
                className="input font-mono text-xs min-h-[120px]" 
                value={formData.payloadStr} 
                onChange={e => setFormData({...formData, payloadStr: e.target.value})} 
              />
              <p className="text-xs text-gray-500 mt-1">The demo worker expects durationMs and failureRate.</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button type="submit">Dispatch Job</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4 p-4 glass rounded-lg border border-surface-border mb-4">
        <div className="w-1/3">
          <label className="label">Status Filter</label>
          <select className="select" value={status} onChange={e => handleFilterChange('status', e.target.value)}>
            <option value="">All Statuses</option>
            <option value="QUEUED">Queued</option>
            <option value="CLAIMED">Claimed</option>
            <option value="RUNNING">Running</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="DEAD_LETTER">Dead Letter</option>
          </select>
        </div>
        <div className="w-1/3">
          <label className="label">Queue Filter</label>
          <select className="select" value={queueId} onChange={e => handleFilterChange('queueId', e.target.value)}>
            <option value="">All Queues</option>
            {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Job Name</th>
                <th>Status</th>
                <th>Queue</th>
                <th>Type</th>
                <th>Attempt</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="font-medium">
                    <Link to={`/jobs/${job.id}`} className="hover:text-primary-400 text-white transition-colors">
                      {job.name}
                    </Link>
                  </td>
                  <td><Badge status={job.status} /></td>
                  <td>{job.queue?.name}</td>
                  <td><span className="text-xs bg-surface-elevated px-2 py-1 rounded text-gray-400">{job.jobType}</span></td>
                  <td>{job.currentAttempt} / {job.maxRetries}</td>
                  <td className="text-gray-400">{new Date(job.createdAt).toLocaleString()}</td>
                  <td>
                    <Link to={`/jobs/${job.id}`}>
                      <Button variant="secondary" size="sm">Details</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobs.length === 0 && (
            <div className="text-center py-8 text-gray-400">No jobs found matching criteria.</div>
          )}
        </div>
      )}
      
      {/* Pagination (Simple Next/Prev for demo) */}
      <div className="flex justify-between items-center pt-4">
        <Button 
          variant="secondary" 
          disabled={page <= 1} 
          onClick={() => handleFilterChange('page', (page - 1).toString())}
        >
          Previous
        </Button>
        <span className="text-sm text-gray-400">Page {page}</span>
        <Button 
          variant="secondary" 
          disabled={jobs.length < 20} 
          onClick={() => handleFilterChange('page', (page + 1).toString())}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
