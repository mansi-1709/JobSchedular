import { Logger } from 'pino';
import { completeJob, failJob, ClaimResult } from '../services/apiClient';

/**
 * Executes a job by simulating real work.
 *
 * In a production system, this would dispatch to actual job handlers
 * based on job type/name. For demonstration, we simulate:
 * - Variable execution duration (configurable via payload)
 * - Configurable failure probability (for testing retries/DLQ)
 */
export async function executeJob(
  claim: ClaimResult,
  workerId: string,
  logger: Logger,
): Promise<void> {
  const { job, executionId } = claim;

  const payload = job.payload as Record<string, unknown>;
  const durationMs = (payload.durationMs as number) ?? randomBetween(500, 3000);
  const failureRate = (payload.failureRate as number) ?? 0.2; // 20% default failure rate
  const shouldFail = Math.random() < failureRate;

  logger.info(
    { jobId: job.id, jobName: job.name, durationMs, willFail: shouldFail },
    'Starting job execution',
  );

  // Simulate work
  await sleep(durationMs);

  if (shouldFail) {
    const errorMsg = `Simulated failure for job '${job.name}' (attempt ${job.currentAttempt + 1})`;
    logger.warn({ jobId: job.id, error: errorMsg }, 'Job execution failed');
    await failJob(job.id, workerId, executionId, errorMsg);
    return;
  }

  logger.info({ jobId: job.id, durationMs }, 'Job execution completed successfully');
  await completeJob(job.id, workerId, executionId);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
