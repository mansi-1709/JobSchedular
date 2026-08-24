import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export interface WorkerRegistration {
  id: string;
  hostname: string;
  pid: number;
  status: string;
}

export interface ClaimResult {
  job: {
    id: string;
    name: string;
    payload: Record<string, unknown>;
    queueId: string;
    maxRetries: number;
    currentAttempt: number;
    retryStrategy: string;
    retryDelayMs: number;
  };
  executionId: string;
}

export async function registerWorker(hostname: string, pid: number): Promise<WorkerRegistration> {
  const res = await apiClient.post('/api/workers/register', { hostname, pid });
  return res.data.data;
}

export async function sendHeartbeat(
  workerId: string,
  status: string,
  currentJobIds: string[],
  jobsProcessed: number,
): Promise<void> {
  await apiClient.post('/api/workers/heartbeat', {
    workerId,
    status,
    currentJobIds,
    jobsProcessed,
  });
}

export async function deregisterWorker(workerId: string): Promise<void> {
  await apiClient.delete(`/api/workers/${workerId}`);
}

export async function claimJob(queueId: string, workerId: string): Promise<ClaimResult | null> {
  const res = await apiClient.post('/api/jobs/worker/claim', { queueId, workerId });
  return res.data.data;
}

export async function completeJob(
  jobId: string,
  workerId: string,
  executionId: string,
): Promise<void> {
  await apiClient.post('/api/jobs/worker/complete', { jobId, workerId, executionId });
}

export async function failJob(
  jobId: string,
  workerId: string,
  executionId: string,
  errorMessage: string,
): Promise<void> {
  await apiClient.post('/api/jobs/worker/fail', { jobId, workerId, executionId, errorMessage });
}

export async function getActiveQueues(): Promise<{ id: string; name: string; concurrencyLimit: number }[]> {
  const res = await apiClient.get('/api/queues');
  return (res.data.data ?? []).filter((q: any) => q.status === 'ACTIVE');
}
