// ============================================================
// Shared TypeScript types for the frontend
// ============================================================

export type UserRole = 'ADMIN' | 'MEMBER';
export type QueueStatus = 'ACTIVE' | 'PAUSED';
export type RetryStrategy = 'FIXED' | 'LINEAR' | 'EXPONENTIAL';
export type JobType = 'IMMEDIATE' | 'DELAYED' | 'SCHEDULED' | 'RECURRING' | 'BATCH';
export type JobStatus = 'QUEUED' | 'SCHEDULED' | 'CLAIMED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER' | 'CANCELLED';
export type WorkerStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'IDLE';
export type ExecutionStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgId?: string;
  organization?: Organization;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { queues: number };
  queues?: Queue[];
}

export interface Queue {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  priority: number;
  concurrencyLimit: number;
  retryStrategy: RetryStrategy;
  maxRetries: number;
  retryDelayMs: number;
  status: QueueStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { jobs: number };
  stats?: QueueStats;
}

export interface QueueStats {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  deadLetter: number;
  throughput: number;
  retryCount: number;
}

export interface Job {
  id: string;
  queueId: string;
  name: string;
  payload: Record<string, unknown>;
  jobType: JobType;
  status: JobStatus;
  priority: number;
  scheduledAt?: string;
  cronExpression?: string;
  maxRetries: number;
  retryStrategy: RetryStrategy;
  retryDelayMs: number;
  currentAttempt: number;
  claimedBy?: string;
  claimedAt?: string;
  nextRetryAt?: string;
  batchId?: string;
  createdAt: string;
  updatedAt: string;
  queue?: { name: string; projectId: string };
  executions?: JobExecution[];
  logs?: JobLog[];
  deadLetterJob?: DeadLetterJob;
}

export interface JobExecution {
  id: string;
  jobId: string;
  workerId?: string;
  attemptNumber: number;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
  worker?: { id: string; hostname: string; pid?: number };
}

export interface JobLog {
  id: string;
  jobId: string;
  executionId?: string;
  level: LogLevel;
  message: string;
  timestamp: string;
}

export interface Worker {
  id: string;
  hostname: string;
  pid: number;
  status: WorkerStatus;
  lastHeartbeatAt: string;
  startedAt: string;
  jobsProcessed: number;
  currentJobIds: string[];
  isStale?: boolean;
}

export interface DeadLetterJob {
  id: string;
  jobId: string;
  queueId: string;
  failureReason: string;
  lastError?: string;
  attemptCount: number;
  failedWorkerId?: string;
  failedAt: string;
  job?: { name: string; jobType: JobType; currentAttempt: number };
  queue?: { name: string };
}

export interface Metrics {
  summary: {
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    deadLetter: number;
    activeWorkers: number;
  };
  throughputChart: ThroughputPoint[];
  queueStats: QueueMetric[];
  recentFailures: Job[];
}

export interface ThroughputPoint {
  hour: string;
  completed: number;
  failed: number;
  avgDuration: number;
}

export interface QueueMetric {
  queueId: string;
  name: string;
  total: number;
  completed: number;
  failed: number;
  running: number;
}

export interface PaginatedResponse<T> {
  jobs: T[];
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string; statusCode: number };
}
