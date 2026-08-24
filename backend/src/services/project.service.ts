import { prisma } from '../config/prisma';
import { createError } from '../middleware/errorHandler';

export async function createProject(orgId: string, name: string, description?: string) {
  return prisma.project.create({
    data: { orgId, name, description },
  });
}

export async function getProjects(orgId: string) {
  return prisma.project.findMany({
    where: { orgId },
    include: {
      _count: { select: { queues: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProjectById(id: string, orgId: string) {
  const project = await prisma.project.findFirst({
    where: { id, orgId },
    include: {
      queues: {
        include: {
          _count: { select: { jobs: true } },
        },
      },
      _count: { select: { queues: true } },
    },
  });
  if (!project) throw createError(404, 'Project not found');
  return project;
}

export async function updateProject(
  id: string,
  orgId: string,
  data: { name?: string; description?: string },
) {
  const project = await prisma.project.findFirst({ where: { id, orgId } });
  if (!project) throw createError(404, 'Project not found');
  return prisma.project.update({ where: { id }, data });
}

export async function deleteProject(id: string, orgId: string) {
  const project = await prisma.project.findFirst({ where: { id, orgId } });
  if (!project) throw createError(404, 'Project not found');
  await prisma.project.delete({ where: { id } });
}

export async function getProjectStats(id: string, orgId: string) {
  const project = await prisma.project.findFirst({ where: { id, orgId } });
  if (!project) throw createError(404, 'Project not found');

  const queueIds = (
    await prisma.queue.findMany({ where: { projectId: id }, select: { id: true } })
  ).map((q) => q.id);

  const [total, queued, running, completed, failed, deadLetter] = await Promise.all([
    prisma.job.count({ where: { queueId: { in: queueIds } } }),
    prisma.job.count({ where: { queueId: { in: queueIds }, status: 'QUEUED' } }),
    prisma.job.count({ where: { queueId: { in: queueIds }, status: { in: ['RUNNING', 'CLAIMED'] } } }),
    prisma.job.count({ where: { queueId: { in: queueIds }, status: 'COMPLETED' } }),
    prisma.job.count({ where: { queueId: { in: queueIds }, status: 'FAILED' } }),
    prisma.job.count({ where: { queueId: { in: queueIds }, status: 'DEAD_LETTER' } }),
  ]);

  return { projectId: id, total, queued, running, completed, failed, deadLetter };
}
