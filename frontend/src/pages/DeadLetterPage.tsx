import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jobService } from '../services/job.service';
import type { DeadLetterJob } from '../types/api.types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import {
  AlertOctagon,
  RotateCw,
  Layers,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  History,
} from 'lucide-react';

export function DeadLetterPage() {
  const [dlqJobs, setDlqJobs] = useState<DeadLetterJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchDLQ = async () => {
    try {
      const data = await jobService.getDeadLetterJobs();
      setDlqJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDLQ();
  }, []);

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      await jobService.retryJob(jobId);
      await fetchDLQ();
    } catch (err) {
      console.error(err);
      alert('Failed to retry job');
    } finally {
      setRetryingId(null);
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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-surface-elevated/70 to-slate-900/40 border border-rose-500/20 shadow-xl backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <AlertOctagon className="w-6 h-6 text-rose-500" />
            Dead Letter Queue (DLQ)
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Quarantine area for unrecoverable jobs exceeding retry limits ({dlqJobs.length} permanent failures)
          </p>
        </div>
        <Button onClick={fetchDLQ} variant="secondary" size="sm" className="flex items-center gap-1.5 border-rose-500/30 text-rose-700 dark:text-rose-200">
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </Button>
      </div>

      {/* Table Container */}
      <div className="table-container shadow-md">
        <table>
          <thead>
            <tr>
              <th>Job Name</th>
              <th>Queue</th>
              <th>Attempts</th>
              <th>Failure Cause / Exception</th>
              <th>Quarantined At</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {dlqJobs.map((dlq) => (
              <tr key={dlq.id} className="hover:bg-rose-500/10 group">
                <td className="font-semibold">
                  <Link
                    to={`/jobs/${dlq.jobId}`}
                    className="text-rose-700 dark:text-rose-200 hover:text-rose-900 dark:hover:text-rose-400 transition-colors flex items-center gap-1.5"
                  >
                    <span>{dlq.job?.name || 'Failed Job'}</span>
                  </Link>
                  <span className="text-[11px] font-mono text-slate-400 dark:text-gray-500 block truncate max-w-[200px]">
                    {dlq.jobId}
                  </span>
                </td>
                <td>
                  <span className="text-xs text-slate-700 dark:text-gray-300 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    {dlq.queue?.name || 'Default'}
                  </span>
                </td>
                <td>
                  <span className="text-xs font-mono text-rose-700 dark:text-rose-300 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                    {dlq.attemptCount} tries
                  </span>
                </td>
                <td className="max-w-md">
                  <div
                    className="text-xs font-mono text-rose-800 dark:text-rose-300 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 truncate"
                    title={dlq.lastError || dlq.failureReason}
                  >
                    {dlq.lastError || dlq.failureReason}
                  </div>
                </td>
                <td className="text-xs text-slate-500 dark:text-gray-400">
                  {new Date(dlq.failedAt).toLocaleTimeString()} ({new Date(dlq.failedAt).toLocaleDateString()})
                </td>
                <td className="text-right">
                  <Button
                    size="sm"
                    isLoading={retryingId === dlq.jobId}
                    onClick={() => handleRetry(dlq.jobId)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                  >
                    <RotateCw className="w-3.5 h-3.5 mr-1" />
                    Re-queue
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dlqJobs.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500/70 mb-3 animate-pulse" />
            <p className="text-base font-bold text-slate-900 dark:text-gray-200">Dead Letter Queue is Clear</p>
            <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">Zero unhandled exceptions or permanently failed tasks.</p>
          </div>
        )}
      </div>
    </div>
  );
}
