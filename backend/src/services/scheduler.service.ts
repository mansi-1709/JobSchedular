import { prisma } from '../config/prisma';
import { getNextCronDate } from '../utils/cron';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { getSocketService } from './socket.service';

let schedulerTimer: NodeJS.Timeout | null = null;

/**
 * The Scheduler runs on the API server as a recurring tick.
 *
 * Each tick it:
 * 1. Promotes SCHEDULED/DELAYED jobs whose scheduledAt <= now to QUEUED.
 * 2. For RECURRING jobs, checks if nextRunAt <= now and creates a new execution.
 * 3. Promotes retry-eligible QUEUED jobs (those with nextRetryAt <= now).
 */
export async function startScheduler(): Promise<void> {
  logger.info('Scheduler starting...');
  schedulerTimer = setInterval(tick, config.scheduler.tickMs);
  // Run immediately on start
  await tick();
}

export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    logger.info('Scheduler stopped');
  }
}

async function tick(): Promise<void> {
  try {
    const now = new Date();

    // 1. Promote SCHEDULED/DELAYED jobs to QUEUED
    const promoted = await prisma.job.updateMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
        jobType: { in: ['SCHEDULED', 'DELAYED'] },
      },
      data: { status: 'QUEUED' },
    });

    if (promoted.count > 0) {
      logger.info({ count: promoted.count }, 'Scheduler: promoted scheduled jobs to QUEUED');
    }

    // 2. Handle recurring jobs whose nextRunAt has passed
    const dueRecurring = await prisma.scheduledJob.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
        job: { status: 'SCHEDULED' },
      },
      include: { job: true },
    });

    for (const sched of dueRecurring) {
      const nextRunAt = getNextCronDate(sched.cronExpression, now);
      await prisma.$transaction([
        prisma.job.update({
          where: { id: sched.jobId },
          data: { status: 'QUEUED', scheduledAt: now },
        }),
        prisma.scheduledJob.update({
          where: { id: sched.id },
          data: { lastRunAt: now, nextRunAt },
        }),
      ]);
      logger.debug({ jobId: sched.jobId }, 'Scheduler: triggered recurring job');
    }

    // 3. Promote retry-eligible jobs (nextRetryAt has passed)
    const retryPromoted = await prisma.job.updateMany({
      where: {
        status: 'QUEUED',
        nextRetryAt: { lte: now },
      },
      data: { nextRetryAt: null, scheduledAt: null },
    });

    if (retryPromoted.count > 0) {
      logger.debug({ count: retryPromoted.count }, 'Scheduler: retry-eligible jobs ready');
    }

    // 4. Stale Worker Reaping & Orphaned Job Failover (heartbeat > 45s ago)
    const staleThreshold = new Date(now.getTime() - 45000);
    const staleWorkers = await prisma.worker.findMany({
      where: {
        status: { in: ['ONLINE', 'BUSY'] },
        lastHeartbeatAt: { lt: staleThreshold },
      },
    });

    for (const worker of staleWorkers) {
      logger.warn({ workerId: worker.id, hostname: worker.hostname }, 'Scheduler: reaping stale worker');
      
      // Mark worker offline
      await prisma.worker.update({
        where: { id: worker.id },
        data: { status: 'OFFLINE', currentJobIds: [] },
      });

      // Find jobs held by this dead worker and re-queue them
      const orphanedJobs = await prisma.job.findMany({
        where: {
          claimedBy: worker.id,
          status: { in: ['CLAIMED', 'RUNNING'] },
        },
      });

      for (const job of orphanedJobs) {
        logger.warn({ jobId: job.id, workerId: worker.id }, 'Scheduler: re-queuing orphaned job from dead worker');
        const updated = await prisma.job.update({
          where: { id: job.id },
          data: {
            status: 'QUEUED',
            claimedBy: null,
            claimedAt: null,
          },
        });

        await prisma.jobLog.create({
          data: {
            jobId: job.id,
            level: 'WARN',
            message: `Worker ${worker.hostname} (${worker.id}) went offline unexpectedly. Job re-queued for failover.`,
          },
        });

        getSocketService()?.emitJobUpdate(updated);
      }
    }

  } catch (err) {
    logger.error({ err }, 'Scheduler tick error');
  }
}
