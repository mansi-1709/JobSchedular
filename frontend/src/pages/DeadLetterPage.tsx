import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jobService } from '../services/job.service';
import type { DeadLetterJob } from '../types/api.types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Card } from '../components/ui/Card';

export function DeadLetterPage() {
  const [dlqJobs, setDlqJobs] = useState<DeadLetterJob[]>([]);
  const [loading, setLoading] = useState(true);

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
    try {
      await jobService.retryJob(jobId);
      await fetchDLQ();
    } catch (err) {
      console.error(err);
      alert('Failed to retry job');
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Dead Letter Queue
          </h1>
          <p className="text-gray-400 text-sm mt-1">Jobs that permanently failed after all retry attempts</p>
        </div>
        <Button onClick={fetchDLQ} variant="secondary">Refresh</Button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Name</th>
              <th>Queue</th>
              <th>Attempts</th>
              <th>Reason</th>
              <th>Failed At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {dlqJobs.map((dlq) => (
              <tr key={dlq.id}>
                <td className="font-mono text-xs">{dlq.jobId.substring(0,8)}...</td>
                <td className="font-medium text-red-300">
                  <Link to={`/jobs/${dlq.jobId}`} className="hover:text-red-200">
                    {dlq.job?.name || 'Unknown'}
                  </Link>
                </td>
                <td>{dlq.queue?.name}</td>
                <td>{dlq.attemptCount}</td>
                <td className="max-w-xs truncate text-xs text-red-400" title={dlq.lastError || dlq.failureReason}>
                  {dlq.failureReason}
                </td>
                <td className="text-gray-400">{new Date(dlq.failedAt).toLocaleString()}</td>
                <td>
                  <Button variant="secondary" size="sm" onClick={() => handleRetry(dlq.jobId)}>
                    Retry
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {dlqJobs.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-emerald-500/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-gray-400 text-lg">DLQ is empty. All systems normal.</p>
          </div>
        )}
      </div>
    </div>
  );
}
