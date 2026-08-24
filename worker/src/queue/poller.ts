import { Logger } from 'pino';
import { claimJob, getActiveQueues, ClaimResult } from '../services/apiClient';
import { executeJob } from '../execution/executor';
import { HeartbeatSender } from '../heartbeat/heartbeat';

export class QueuePoller {
  private workerId: string;
  private logger: Logger;
  private heartbeat: HeartbeatSender;
  private running = false;
  private pollIntervalMs: number;
  private activeJobs: Set<string> = new Set();
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(
    workerId: string,
    logger: Logger,
    heartbeat: HeartbeatSender,
    pollIntervalMs = 2000,
  ) {
    this.workerId = workerId;
    this.logger = logger;
    this.heartbeat = heartbeat;
    this.pollIntervalMs = pollIntervalMs;
  }

  start(): void {
    this.running = true;
    this.schedulePoll();
    this.logger.info({ pollIntervalMs: this.pollIntervalMs }, 'Queue poller started');
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    // Wait for active jobs to finish (graceful drain, max 30s)
    const deadline = Date.now() + 30000;
    while (this.activeJobs.size > 0 && Date.now() < deadline) {
      this.logger.info(
        { activeJobs: this.activeJobs.size },
        'Waiting for active jobs to complete...',
      );
      await sleep(1000);
    }

    if (this.activeJobs.size > 0) {
      this.logger.warn({ activeJobs: this.activeJobs.size }, 'Shutdown timeout — some jobs still running');
    } else {
      this.logger.info('All active jobs completed gracefully');
    }
  }

  private schedulePoll(): void {
    if (!this.running) return;
    this.pollTimer = setTimeout(async () => {
      await this.poll();
      this.schedulePoll();
    }, this.pollIntervalMs);
  }

  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      const queues = await getActiveQueues();

      for (const queue of queues) {
        if (!this.running) break;

        // Try to claim a job from this queue
        const claim = await claimJob(queue.id, this.workerId);
        if (!claim) continue;

        // Execute the job concurrently (fire-and-forget)
        this.executeAsync(claim);
      }
    } catch (err) {
      this.logger.warn({ err }, 'Poll error');
    }
  }

  private executeAsync(claim: ClaimResult): void {
    const jobId = claim.job.id;
    this.activeJobs.add(jobId);
    this.heartbeat.addJob(jobId);

    this.logger.info({ jobId, jobName: claim.job.name }, 'Starting job');

    executeJob(claim, this.workerId, this.logger)
      .catch((err) => {
        this.logger.error({ err, jobId }, 'Unexpected executor error');
      })
      .finally(() => {
        this.activeJobs.delete(jobId);
        this.heartbeat.removeJob(jobId);
        this.logger.debug({ jobId, activeJobs: this.activeJobs.size }, 'Job finished');
      });
  }

  getActiveJobCount(): number {
    return this.activeJobs.size;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
