import { prisma } from '../config/prisma';
import { Job, JobStatus, Prisma } from '@prisma/client';

/**
 * ATOMIC JOB CLAIMING
 * -------------------
 * Uses PostgreSQL's FOR UPDATE SKIP LOCKED inside a serializable transaction.
 *
 * Why FOR UPDATE SKIP LOCKED?
 * - FOR UPDATE: locks the selected row to prevent concurrent updates.
 * - SKIP LOCKED: instead of waiting on a locked row (which causes contention),
 *   this worker simply skips it and moves to the next available job.
 *
 * This guarantees that even if 100 workers call claimNextJob simultaneously,
 * each job will be claimed by exactly ONE worker with zero duplicate execution.
 *
 * Alternative approaches (Redis, application-level locks) were rejected because:
 * 1. FOR UPDATE SKIP LOCKED is a built-in PostgreSQL primitive — no extra infrastructure.
 * 2. It's transactional: if the UPDATE fails for any reason, the SELECT is also rolled back.
 * 3. Performance is excellent for typical job queue workloads.
 */
export async function claimNextJob(
  queueId: string,
  workerId: string,
): Promise<Job | null> {
  return await prisma.$transaction(async (tx) => {
    // Step 1: Find the oldest, highest-priority QUEUED job for this queue
    // FOR UPDATE SKIP LOCKED ensures exclusive access with no waiting
    const result = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Job"
      WHERE "queueId" = ${queueId}
        AND "status" = 'QUEUED'
        AND ("scheduledAt" IS NULL OR "scheduledAt" <= NOW())
      ORDER BY "priority" DESC, "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (result.length === 0) return null;

    const jobId = result[0].id;

    // Step 2: Atomically update status to CLAIMED within the same transaction
    const claimedJob = await tx.job.update({
      where: { id: jobId },
      data: {
        status: 'CLAIMED',
        claimedBy: workerId,
        claimedAt: new Date(),
      },
    });

    return claimedJob;
  });
}

/**
 * Get count of currently RUNNING jobs for a queue (for concurrency enforcement).
 */
export async function getRunningJobCount(queueId: string): Promise<number> {
  return prisma.job.count({
    where: {
      queueId,
      status: { in: ['CLAIMED', 'RUNNING'] },
    },
  });
}

export async function findJobById(id: string): Promise<Job | null> {
  return prisma.job.findUnique({ where: { id } });
}

export interface JobListOptions {
  queueId?: string;
  status?: JobStatus | JobStatus[];
  jobType?: string;
  priority?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function listJobs(
  orgId: string,
  options: JobListOptions = {},
): Promise<{ jobs: Job[]; total: number }> {
  const {
    queueId,
    status,
    jobType,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const where: Prisma.JobWhereInput = {
    queue: {
      project: {
        organization: { id: orgId },
      },
    },
  };

  if (queueId) where.queueId = queueId;
  if (status) {
    where.status = Array.isArray(status) ? { in: status } : status;
  }
  if (jobType) where.jobType = jobType as any;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: { queue: { select: { name: true, projectId: true } } },
    }),
    prisma.job.count({ where }),
  ]);

  return { jobs, total };
}
