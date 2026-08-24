import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';
import { getSocketService } from './socket.service';
import { WorkerStatus } from '@prisma/client';

export async function registerWorker(hostname: string, pid: number, metadata?: object) {
  const worker = await prisma.worker.create({
    data: { hostname, pid, status: 'ONLINE', metadata: metadata ?? {} },
  });
  getSocketService()?.emitWorkerUpdate(worker);
  return worker;
}

export async function sendHeartbeat(
  workerId: string,
  status: WorkerStatus,
  currentJobIds: string[],
  jobsProcessed: number,
) {
  const now = new Date();
  const [worker] = await Promise.all([
    prisma.worker.update({
      where: { id: workerId },
      data: { lastHeartbeatAt: now, status, currentJobIds, jobsProcessed },
    }),
    prisma.workerHeartbeat.create({
      data: { workerId, status, currentJobIds, jobsProcessed, timestamp: now },
    }),
  ]);
  getSocketService()?.emitWorkerUpdate(worker);
  return worker;
}

export async function deregisterWorker(workerId: string) {
  const worker = await prisma.worker.update({
    where: { id: workerId },
    data: { status: 'OFFLINE', currentJobIds: [] },
  });
  getSocketService()?.emitWorkerUpdate(worker);
  return worker;
}

export async function getWorkers() {
  const workers = await prisma.worker.findMany({
    orderBy: { startedAt: 'desc' },
  });

  // Mark stale workers as OFFLINE (no heartbeat in 30s)
  const staleThreshold = new Date(Date.now() - 30000);
  return workers.map((w) => ({
    ...w,
    status: w.lastHeartbeatAt < staleThreshold && w.status !== 'OFFLINE' ? 'OFFLINE' : w.status,
    isStale: w.lastHeartbeatAt < staleThreshold,
  }));
}

export async function getWorkerById(id: string) {
  const worker = await prisma.worker.findUnique({
    where: { id },
    include: {
      heartbeats: {
        orderBy: { timestamp: 'desc' },
        take: 20,
      },
    },
  });
  if (!worker) throw createError(404, 'Worker not found');
  return worker;
}
