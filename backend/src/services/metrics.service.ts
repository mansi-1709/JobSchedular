import { prisma } from '../config/prisma';

export async function getGlobalMetrics(orgId: string) {
  const queueIds = (
    await prisma.queue.findMany({
      where: { project: { orgId } },
      select: { id: true },
    })
  ).map((q) => q.id);

  const [total, queued, running, completed, failed, deadLetter] = await Promise.all([
    prisma.job.count({ where: { queueId: { in: queueIds } } }),
    prisma.job.count({ where: { queueId: { in: queueIds }, status: 'QUEUED' } }),
    prisma.job.count({ where: { queueId: { in: queueIds }, status: { in: ['RUNNING', 'CLAIMED'] } } }),
    prisma.job.count({ where: { queueId: { in: queueIds }, status: 'COMPLETED' } }),
    prisma.job.count({ where: { queueId: { in: queueIds }, status: 'FAILED' } }),
    prisma.job.count({ where: { queueId: { in: queueIds }, status: 'DEAD_LETTER' } }),
  ]);

  // Active workers
  const staleThreshold = new Date(Date.now() - 30000);
  const activeWorkers = await prisma.worker.count({
    where: { lastHeartbeatAt: { gte: staleThreshold }, status: { not: 'OFFLINE' } },
  });

  // Throughput (completions per hour for past 24 hours, grouped by hour)
  const oneDayAgo = new Date(Date.now() - 86400000);
  const executions = await prisma.jobExecution.findMany({
    where: {
      job: { queueId: { in: queueIds } },
      completedAt: { gte: oneDayAgo },
    },
    select: { completedAt: true, status: true, durationMs: true },
  });

  // Group by hour
  const hourlyMap = new Map<string, { completed: number; failed: number; avgDuration: number; durations: number[] }>();
  for (const exec of executions) {
    if (!exec.completedAt) continue;
    const hour = new Date(exec.completedAt);
    hour.setMinutes(0, 0, 0);
    const key = hour.toISOString();
    if (!hourlyMap.has(key)) hourlyMap.set(key, { completed: 0, failed: 0, avgDuration: 0, durations: [] });
    const bucket = hourlyMap.get(key)!;
    if (exec.status === 'COMPLETED') {
      bucket.completed++;
      if (exec.durationMs) bucket.durations.push(exec.durationMs);
    } else {
      bucket.failed++;
    }
  }

  const throughputChart = Array.from(hourlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, data]) => ({
      hour,
      completed: data.completed,
      failed: data.failed,
      avgDuration: data.durations.length
        ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
        : 0,
    }));

  // Per-queue stats
  const queues = await prisma.queue.findMany({
    where: { id: { in: queueIds } },
    include: { _count: { select: { jobs: true } } },
  });
  const queueStats = await Promise.all(
    queues.map(async (q) => {
      const [qTotal, qCompleted, qFailed, qRunning] = await Promise.all([
        prisma.job.count({ where: { queueId: q.id } }),
        prisma.job.count({ where: { queueId: q.id, status: 'COMPLETED' } }),
        prisma.job.count({ where: { queueId: q.id, status: { in: ['FAILED', 'DEAD_LETTER'] } } }),
        prisma.job.count({ where: { queueId: q.id, status: { in: ['RUNNING', 'CLAIMED'] } } }),
      ]);
      return { queueId: q.id, name: q.name, total: qTotal, completed: qCompleted, failed: qFailed, running: qRunning };
    }),
  );

  // Recent failures
  const recentFailures = await prisma.job.findMany({
    where: { queueId: { in: queueIds }, status: { in: ['FAILED', 'DEAD_LETTER'] } },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    include: { queue: { select: { name: true } } },
  });

  return {
    summary: { total, queued, running, completed, failed, deadLetter, activeWorkers },
    throughputChart,
    queueStats,
    recentFailures,
  };
}
