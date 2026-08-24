import { Logger } from 'pino';
import { sendHeartbeat } from '../services/apiClient';

export class HeartbeatSender {
  private timer: NodeJS.Timeout | null = null;
  private workerId: string;
  private logger: Logger;
  private currentJobIds: Set<string> = new Set();
  private jobsProcessed = 0;
  private intervalMs: number;

  constructor(workerId: string, logger: Logger, intervalMs = 5000) {
    this.workerId = workerId;
    this.logger = logger;
    this.intervalMs = intervalMs;
  }

  start(): void {
    this.timer = setInterval(() => this.beat(), this.intervalMs);
    this.logger.debug('Heartbeat started');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  addJob(jobId: string): void {
    this.currentJobIds.add(jobId);
  }

  removeJob(jobId: string): void {
    this.currentJobIds.delete(jobId);
    this.jobsProcessed++;
  }

  getJobsProcessed(): number {
    return this.jobsProcessed;
  }

  private async beat(): Promise<void> {
    const status = this.currentJobIds.size > 0 ? 'BUSY' : 'IDLE';
    try {
      await sendHeartbeat(
        this.workerId,
        status,
        Array.from(this.currentJobIds),
        this.jobsProcessed,
      );
      this.logger.debug({ status, jobs: this.currentJobIds.size }, 'Heartbeat sent');
    } catch (err) {
      this.logger.warn({ err }, 'Heartbeat failed');
    }
  }
}
