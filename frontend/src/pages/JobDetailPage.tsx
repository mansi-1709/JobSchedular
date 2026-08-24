import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobService } from '../services/job.service';
import type { Job, JobExecution, JobLog } from '../types/api.types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useJobUpdate } from '../context/SocketContext';

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [executions, setExecutions] = useState<JobExecution[]>([]);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchJobData = async () => {
    if (!id) return;
    try {
      const [jobData, execData, logData] = await Promise.all([
        jobService.getJobById(id),
        jobService.getJobExecutions(id),
        jobService.getJobLogs(id),
      ]);
      setJob(jobData);
      setExecutions(execData);
      setLogs(logData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [id]);

  // Real-time updates
  useJobUpdate((updatedJob) => {
    if (updatedJob.id === id) {
      // Re-fetch everything to get the latest executions and logs
      fetchJobData();
    }
  });

  const handleRetry = async () => {
    if (!id) return;
    setIsRetrying(true);
    try {
      await jobService.retryJob(id);
      await fetchJobData();
    } catch (err) {
      console.error(err);
      alert('Failed to retry job');
    } finally {
      setIsRetrying(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;
  if (!job) return <div className="text-center py-10 text-red-400">Job not found</div>;

  const canRetry = job.status === 'FAILED' || job.status === 'DEAD_LETTER';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Link to={`/queues/${job.queueId}`} className="hover:text-white transition-colors">{job.queue?.name}</Link>
            <span>/</span>
            <Link to="/jobs" className="hover:text-white transition-colors">Jobs</Link>
            <span>/</span>
            <span className="text-white font-mono text-xs">{job.id.substring(0,8)}...</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{job.name}</h1>
            <Badge status={job.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {canRetry && (
            <Button onClick={handleRetry} isLoading={isRetrying}>
              Retry Job Manually
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader title="Details" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Job ID</span>
                <span className="font-mono text-xs">{job.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span>{job.jobType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Priority</span>
                <span>{job.priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Attempts</span>
                <span>{job.currentAttempt} / {job.maxRetries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created</span>
                <span>{new Date(job.createdAt).toLocaleString()}</span>
              </div>
              {job.nextRetryAt && (
                <div className="flex justify-between text-yellow-400">
                  <span>Next Retry</span>
                  <span>{new Date(job.nextRetryAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payload" />
            <pre className="bg-surface p-3 rounded-lg text-xs font-mono overflow-x-auto text-green-400 border border-surface-border">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Execution History" />
            {executions.length === 0 ? (
              <p className="text-gray-400 text-sm">No executions yet.</p>
            ) : (
              <div className="space-y-3">
                {executions.map((exec) => (
                  <div key={exec.id} className="p-3 rounded-lg bg-surface-elevated border border-surface-border">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <Badge status={exec.status} />
                        <span className="text-sm font-medium">Attempt {exec.attemptNumber}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {exec.durationMs ? `${exec.durationMs}ms` : 'Running...'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 flex justify-between">
                      <span>Worker: {exec.worker?.hostname || exec.workerId || 'Unknown'}</span>
                      <span>{new Date(exec.startedAt).toLocaleString()}</span>
                    </div>
                    {exec.errorMessage && (
                      <div className="mt-2 p-2 bg-red-950/30 text-red-300 text-xs rounded border border-red-900/50 break-words">
                        {exec.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Job Logs" />
            <div className="bg-surface p-4 rounded-lg border border-surface-border max-h-[400px] overflow-y-auto space-y-2">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No logs available.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={`log-entry log-${log.level.toLowerCase()}`}>
                    <span className="text-gray-500 mr-3">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
