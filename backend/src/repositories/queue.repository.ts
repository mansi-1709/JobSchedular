import { prisma } from '../config/prisma';
import { Queue, QueueStatus } from '@prisma/client';

export async function findQueueById(id: string): Promise<Queue | null> {
  return prisma.queue.findUnique({ where: { id } });
}

export async function getQueueStats(queueId: string) {
  const [total, queued, running, completed, failed, deadLetter] = await Promise.all([
    prisma.job.count({ where: { queueId } }),
    prisma.job.count({ where: { queueId, status: 'QUEUED' } }),
    prisma.job.count({ where: { queueId, status: { in: ['CLAIMED', 'RUNNING'] } } }),
    prisma.job.count({ where: { queueId, status: 'COMPLETED' } }),
    prisma.job.count({ where: { queueId, status: 'FAILED' } }),
    prisma.job.count({ where: { queueId, status: 'DEAD_LETTER' } }),
  ]);

  // Throughput: jobs completed in the last hour
  const oneHourAgo = new Date(Date.now() - 3600000);
  const throughput = await prisma.jobExecution.count({
    where: {
      job: { queueId },
      status: 'COMPLETED',
      completedAt: { gte: oneHourAgo },
    },
  });

  const retryCount = await prisma.job.aggregate({
    where: { queueId },
    _sum: { currentAttempt: true },
  });

  return {
    total,
    queued,
    running,
    completed,
    failed,
    deadLetter,
    throughput,
    retryCount: retryCount._sum.currentAttempt ?? 0,
  };
}

export async function listQueuesForProject(projectId: string): Promise<Queue[]> {
  return prisma.queue.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });
}
