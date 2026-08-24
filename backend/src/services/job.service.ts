import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';
import { listJobs, claimNextJob, getRunningJobCount } from '../repositories/job.repository';
import { calculateNextRetryAt } from '../utils/backoff';
import { getNextCronDate, isValidCronExpression } from '../utils/cron';
import { getSocketService } from './socket.service';
import type { CreateJobInput, CreateBatchJobsInput, JobQueryInput } from '../validators/job.validator';
import { JobStatus, RetryStrategy, Prisma } from '@prisma/client';

async function assertQueueAccess(queueId: string, orgId: string) {
  const queue = await prisma.queue.findFirst({
    where: { id: queueId, project: { orgId } },
  });
  if (!queue) throw createError(404, 'Queue not found');
  return queue;
}

export async function createJob(orgId: string, input: CreateJobInput) {
  const queue = await assertQueueAccess(input.queueId, orgId);

  // Validate cron expression for recurring jobs
  if (input.jobType === 'RECURRING') {
    if (!input.cronExpression) throw createError(400, 'Recurring jobs require a cronExpression');
    if (!isValidCronExpression(input.cronExpression)) throw createError(400, 'Invalid cron expression');
  }

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : undefined;

  // Determine initial status
  let status: JobStatus = 'QUEUED';
  if (input.jobType === 'SCHEDULED' && scheduledAt && scheduledAt > new Date()) {
    status = 'SCHEDULED';
  } else if (input.jobType === 'RECURRING') {
    status = 'SCHEDULED';
  } else if (input.jobType === 'DELAYED' && scheduledAt) {
    status = 'SCHEDULED';
  }

  const job = await prisma.job.create({
    data: {
      queueId: input.queueId,
      name: input.name,
      payload: (input.payload as Prisma.InputJsonValue) ?? {},
      jobType: input.jobType,
      status,
      priority: input.priority ?? 0,
      scheduledAt,
      cronExpression: input.cronExpression,
      maxRetries: input.maxRetries ?? queue.maxRetries,
      retryStrategy: (input.retryStrategy ?? queue.retryStrategy) as RetryStrategy,
      retryDelayMs: input.retryDelayMs ?? queue.retryDelayMs,
      batchId: input.batchId,
    },
  });

  // For recurring jobs, create ScheduledJob entry
  if (input.jobType === 'RECURRING' && input.cronExpression) {
    const nextRunAt = getNextCronDate(input.cronExpression);
    await prisma.scheduledJob.create({
      data: { jobId: job.id, cronExpression: input.cronExpression, nextRunAt },
    });
  }

  // Log creation
  await prisma.jobLog.create({
    data: { jobId: job.id, level: 'INFO', message: `Job created with status ${status}` },
  });

  // Notify dashboard via WebSocket
  getSocketService()?.emitJobUpdate(job);

  return job;
}

export async function createBatchJobs(orgId: string, input: CreateBatchJobsInput) {
  const batchId = uuidv4();
  const jobs = await Promise.all(
    input.jobs.map((j) => createJob(orgId, { ...j, batchId })),
  );
  return { batchId, count: jobs.length, jobs };
}

export async function getJobs(orgId: string, query: JobQueryInput) {
  const page = parseInt(query.page ?? '1', 10);
  const limit = Math.min(parseInt(query.limit ?? '20', 10), 100);

  const statusFilter = query.status
    ? (query.status.split(',') as JobStatus[])
    : undefined;

  return listJobs(orgId, {
    queueId: query.queueId,
    status: statusFilter,
    jobType: query.jobType,
    search: query.search,
    page,
    limit,
    sortBy: query.sortBy ?? 'createdAt',
    sortOrder: query.sortOrder ?? 'desc',
  });
}

export async function getJobById(id: string, orgId: string) {
  const job = await prisma.job.findFirst({
    where: { id, queue: { project: { orgId } } },
    include: {
      queue: true,
      executions: {
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: { worker: { select: { id: true, hostname: true } } },
      },
      logs: { orderBy: { timestamp: 'asc' }, take: 100 },
      deadLetterJob: true,
      scheduledJob: true,
    },
  });
  if (!job) throw createError(404, 'Job not found');
  return job;
}

export async function retryJob(id: string, orgId: string) {
  const job = await prisma.job.findFirst({
    where: { id, queue: { project: { orgId } } },
  });
  if (!job) throw createError(404, 'Job not found');
  if (!['FAILED', 'DEAD_LETTER'].includes(job.status)) {
    throw createError(400, 'Only FAILED or DEAD_LETTER jobs can be retried');
  }

  const updated = await prisma.job.update({
    where: { id },
    data: {
      status: 'QUEUED',
      currentAttempt: 0,
      claimedBy: null,
      claimedAt: null,
      nextRetryAt: null,
    },
  });

  // Remove from DLQ if present
  await prisma.deadLetterJob.deleteMany({ where: { jobId: id } });

  await prisma.jobLog.create({
    data: { jobId: id, level: 'INFO', message: 'Job manually re-queued by user' },
  });

  getSocketService()?.emitJobUpdate(updated);
  return updated;
}

export async function deleteJob(id: string, orgId: string) {
  const job = await prisma.job.findFirst({
    where: { id, queue: { project: { orgId } } },
  });
  if (!job) throw createError(404, 'Job not found');
  if (job.status === 'RUNNING') throw createError(400, 'Cannot delete a running job');
  await prisma.job.delete({ where: { id } });
}

export async function getJobExecutions(jobId: string, orgId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, queue: { project: { orgId } } },
  });
  if (!job) throw createError(404, 'Job not found');

  return prisma.jobExecution.findMany({
    where: { jobId },
    orderBy: { startedAt: 'desc' },
    include: { worker: { select: { id: true, hostname: true, pid: true } } },
  });
}

export async function getJobLogs(jobId: string, orgId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, queue: { project: { orgId } } },
  });
  if (!job) throw createError(404, 'Job not found');

  return prisma.jobLog.findMany({
    where: { jobId },
    orderBy: { timestamp: 'asc' },
  });
}

// ---- Worker-facing operations (called by workers via API) ----

export async function workerClaimJob(queueId: string, workerId: string) {
  // Check concurrency limit
  const queue = await prisma.queue.findUnique({ where: { id: queueId } });
  if (!queue) return null;
  if (queue.status === 'PAUSED') return null;

  const running = await getRunningJobCount(queueId);
  if (running >= queue.concurrencyLimit) return null;

  const job = await claimNextJob(queueId, workerId);
  if (!job) return null;

  // Immediately transition to RUNNING
  const runningJob = await prisma.job.update({
    where: { id: job.id },
    data: { status: 'RUNNING' },
  });

  // Create execution record
  const execution = await prisma.jobExecution.create({
    data: {
      jobId: job.id,
      workerId,
      attemptNumber: job.currentAttempt + 1,
      status: 'RUNNING',
    },
  });

  await prisma.jobLog.create({
    data: {
      jobId: job.id,
      executionId: execution.id,
      level: 'INFO',
      message: `Job claimed and started by worker ${workerId}`,
    },
  });

  getSocketService()?.emitJobUpdate(runningJob);
  return { job: runningJob, executionId: execution.id };
}

export async function workerCompleteJob(
  jobId: string,
  workerId: string,
  executionId: string,
) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  const now = new Date();
  const execution = await prisma.jobExecution.findUnique({ where: { id: executionId } });
  const durationMs = execution ? now.getTime() - execution.startedAt.getTime() : undefined;

  await prisma.$transaction([
    prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        currentAttempt: { increment: 1 },
        claimedBy: null,
        claimedAt: null,
      },
    }),
    prisma.jobExecution.update({
      where: { id: executionId },
      data: { status: 'COMPLETED', completedAt: now, durationMs },
    }),
    prisma.worker.update({
      where: { id: workerId },
      data: { jobsProcessed: { increment: 1 } },
    }),
    prisma.jobLog.create({
      data: {
        jobId,
        executionId,
        level: 'INFO',
        message: `Job completed successfully in ${durationMs}ms`,
      },
    }),
  ]);

  // If recurring, re-queue for next cron tick
  if (job.jobType === 'RECURRING' && job.cronExpression) {
    const nextRunAt = getNextCronDate(job.cronExpression);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'SCHEDULED',
        scheduledAt: nextRunAt,
        claimedBy: null,
        claimedAt: null,
        currentAttempt: 0,
      },
    });
    await prisma.scheduledJob.update({
      where: { jobId },
      data: { nextRunAt, lastRunAt: now },
    });
  }

  const updated = await prisma.job.findUnique({ where: { id: jobId } });
  if (updated) getSocketService()?.emitJobUpdate(updated);
}

export async function workerFailJob(
  jobId: string,
  workerId: string,
  executionId: string,
  errorMessage: string,
) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  const now = new Date();
  const execution = await prisma.jobExecution.findUnique({ where: { id: executionId } });
  const durationMs = execution ? now.getTime() - execution.startedAt.getTime() : undefined;
  const newAttempt = job.currentAttempt + 1;
  const hasRetriesLeft = newAttempt < job.maxRetries;

  await prisma.jobExecution.update({
    where: { id: executionId },
    data: { status: 'FAILED', completedAt: now, durationMs, errorMessage },
  });

  if (hasRetriesLeft) {
    const nextRetryAt = calculateNextRetryAt(job.retryStrategy, newAttempt, job.retryDelayMs);
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'QUEUED',
        currentAttempt: newAttempt,
        nextRetryAt,
        scheduledAt: nextRetryAt,
        claimedBy: null,
        claimedAt: null,
      },
    });
    await prisma.jobLog.create({
      data: {
        jobId,
        executionId,
        level: 'WARN',
        message: `Job failed (attempt ${newAttempt}/${job.maxRetries}). Retrying at ${nextRetryAt.toISOString()}. Error: ${errorMessage}`,
      },
    });
  } else {
    // Move to Dead Letter Queue
    await prisma.$transaction([
      prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'DEAD_LETTER',
          currentAttempt: newAttempt,
          claimedBy: null,
          claimedAt: null,
        },
      }),
      prisma.deadLetterJob.create({
        data: {
          jobId,
          queueId: job.queueId,
          failureReason: 'Max retry attempts exceeded',
          lastError: errorMessage,
          attemptCount: newAttempt,
          failedWorkerId: workerId,
        },
      }),
      prisma.jobLog.create({
        data: {
          jobId,
          executionId,
          level: 'ERROR',
          message: `Job permanently failed after ${newAttempt} attempts. Moved to Dead Letter Queue. Last error: ${errorMessage}`,
        },
      }),
    ]);
  }

  const updated = await prisma.job.findUnique({ where: { id: jobId } });
  if (updated) getSocketService()?.emitJobUpdate(updated);
}

export async function workerAddLog(
  jobId: string,
  level: any = 'INFO',
  message: string,
  metadata?: any,
  executionId?: string,
) {
  const log = await prisma.jobLog.create({
    data: { jobId, executionId, level, message, metadata },
  });
  return log;
}

export async function getDeadLetterJobs(orgId: string) {
  return prisma.deadLetterJob.findMany({
    where: { queue: { project: { orgId } } },
    include: {
      job: { select: { name: true, jobType: true, currentAttempt: true } },
      queue: { select: { name: true, projectId: true } },
    },
    orderBy: { failedAt: 'desc' },
  });
}
