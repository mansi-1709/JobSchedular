import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';
import { getQueueStats } from '../repositories/queue.repository';
import type { CreateQueueInput, UpdateQueueInput } from '../validators/queue.validator';

async function assertProjectAccess(projectId: string, orgId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, orgId } });
  if (!project) throw createError(404, 'Project not found');
  return project;
}

async function assertQueueAccess(queueId: string, orgId: string) {
  const queue = await prisma.queue.findFirst({
    where: { id: queueId, project: { orgId } },
  });
  if (!queue) throw createError(404, 'Queue not found');
  return queue;
}

export async function createQueue(orgId: string, input: CreateQueueInput) {
  await assertProjectAccess(input.projectId, orgId);

  const existing = await prisma.queue.findFirst({
    where: { projectId: input.projectId, name: input.name },
  });
  if (existing) throw createError(409, `Queue '${input.name}' already exists in this project`);

  return prisma.queue.create({ data: input });
}

export async function getQueues(orgId?: string, projectId?: string) {
  return prisma.queue.findMany({
    where: {
      ...(orgId ? { project: { orgId } } : {}),
      ...(projectId ? { projectId } : {}),
    },
    include: {
      _count: { select: { jobs: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getQueueById(id: string, orgId: string) {
  const queue = await assertQueueAccess(id, orgId);
  const stats = await getQueueStats(id);
  return { ...queue, stats };
}

export async function updateQueue(id: string, orgId: string, input: UpdateQueueInput) {
  await assertQueueAccess(id, orgId);
  return prisma.queue.update({ where: { id }, data: input });
}

export async function deleteQueue(id: string, orgId: string) {
  await assertQueueAccess(id, orgId);
  await prisma.queue.delete({ where: { id } });
}

export async function pauseQueue(id: string, orgId: string) {
  await assertQueueAccess(id, orgId);
  return prisma.queue.update({ where: { id }, data: { status: 'PAUSED' } });
}

export async function resumeQueue(id: string, orgId: string) {
  await assertQueueAccess(id, orgId);
  return prisma.queue.update({ where: { id }, data: { status: 'ACTIVE' } });
}

export async function getQueueStatistics(id: string, orgId: string) {
  await assertQueueAccess(id, orgId);
  return getQueueStats(id);
}
