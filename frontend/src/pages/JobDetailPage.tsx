import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jobService } from '../services/job.service';
import type { Job, JobExecution, JobLog } from '../types/api.types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useJobUpdate } from '../context/SocketContext';
import {
  Cpu,
  RotateCw,
  Terminal,
  Clock,
  Server,
  Layers,
  ChevronRight,
  Code2,
  History,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

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

  // Real-time socket updates
  useJobUpdate((updatedJob) => {
    if (updatedJob.id === id) {
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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20 text-rose-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3" />
        <p className="text-lg font-bold">Job Not Found</p>
        <Link to="/jobs" className="btn-secondary btn-sm mt-4 inline-block">
          Return to Jobs
        </Link>
      </div>
    );
  }

  const canRetry = job.status === 'FAILED' || job.status === 'DEAD_LETTER';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-surface-elevated/70 to-slate-900/40 border border-indigo-500/20 shadow-xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400 mb-2">
            <Link to="/projects" className="hover:text-indigo-600 dark:hover:text-indigo-300">
              Projects
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to={`/queues/${job.queueId}`} className="hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {job.queue?.name || 'Queue'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-indigo-600 dark:text-indigo-300 font-mono">{job.id.substring(0, 10)}...</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{job.name}</h1>
            <Badge status={job.status} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canRetry && (
            <Button
              onClick={handleRetry}
              isLoading={isRetrying}
              className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>Retry / Re-queue Job</span>
            </Button>
          )}
          <button onClick={fetchJobData} className="btn-secondary btn-sm flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Metadata & Payload */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader title="Execution Metadata" />
            <div className="space-y-3.5 text-xs mt-3">
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-gray-400">Job ID</span>
                <span className="font-mono text-slate-800 dark:text-gray-200 select-all">{job.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-gray-400">Execution Type</span>
                <span className="font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-indigo-700 dark:text-indigo-300">
                  {job.jobType}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-gray-400">Queue Priority</span>
                <span className="font-bold text-slate-900 dark:text-white">{job.priority}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-gray-400">Attempt Count</span>
                <span className="text-slate-800 dark:text-gray-200 font-semibold">
                  {job.currentAttempt} / {job.maxRetries}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-gray-400">Retry Strategy</span>
                <span className="font-mono text-slate-700 dark:text-gray-300">{job.retryStrategy}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-white/10">
                <span className="text-slate-500 dark:text-gray-400">Created At</span>
                <span className="text-slate-700 dark:text-gray-300">{new Date(job.createdAt).toLocaleString()}</span>
              </div>
              {job.nextRetryAt && (
                <div className="flex justify-between py-1.5 bg-amber-500/10 px-2 rounded-lg text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/20">
                  <span>Next Scheduled Retry</span>
                  <span>{new Date(job.nextRetryAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-white/10 pb-3 mb-3">
              <Code2 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Input Payload</h3>
            </div>
            <pre className="bg-slate-900 dark:bg-[#0b0c16] p-3.5 rounded-xl text-xs font-mono overflow-x-auto text-emerald-400 border border-emerald-500/20 shadow-inner">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </Card>
        </div>

        {/* Right Column: Execution History & Terminal Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Execution History */}
          <Card>
            <div className="flex items-center gap-2 border-b border-gray-100 dark:border-white/10 pb-3 mb-4">
              <History className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attempt History</h3>
            </div>
            {executions.length === 0 ? (
              <div className="text-center py-6 text-slate-400 dark:text-gray-500 text-xs">No execution attempts recorded yet.</div>
            ) : (
              <div className="space-y-3">
                {executions.map(exec => (
                  <div
                    key={exec.id}
                    className="p-4 rounded-xl bg-surface-elevated/90 border border-slate-200 dark:border-white/10 hover:border-indigo-500/30 transition-all shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2.5">
                        <Badge status={exec.status} />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Attempt #{exec.attemptNumber}</span>
                      </div>
                      <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/40 font-semibold">
                        {exec.durationMs ? `${exec.durationMs}ms duration` : 'Running In-Flight...'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-gray-400 flex flex-wrap justify-between gap-2 mt-2">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-gray-300">
                        <Server className="w-3.5 h-3.5 text-indigo-500" />
                        Worker: {exec.worker?.hostname || exec.workerId || 'Auto Assigned'}
                      </span>
                      <span>Started: {new Date(exec.startedAt).toLocaleTimeString()}</span>
                    </div>
                    {exec.errorMessage && (
                      <div className="mt-3 p-2.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-mono rounded-lg border border-rose-500/20 break-words">
                        ⚠️ {exec.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Live Terminal Logs */}
          <Card>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live Execution Console Logs</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-gray-400">{logs.length} entries</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-[380px] overflow-y-auto space-y-2 font-mono text-xs shadow-inner text-slate-200">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-xs italic py-4 text-center">No runtime logs streamed yet.</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`log-entry log-${log.level.toLowerCase()} flex items-start gap-2.5`}>
                    <span className="text-gray-500 select-none text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="flex-1 break-words">{log.message}</span>
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
