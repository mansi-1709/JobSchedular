import request from 'supertest';
import app from '../../backend/src/app';
import { PrismaClient, JobStatus, JobType, RetryStrategy, WorkerStatus } from '@prisma/client';
import { signToken } from '../../backend/src/utils/jwt';
import crypto from 'crypto';

const prisma = new PrismaClient();

describe('Integration - Job Lifecycle API', () => {
  let orgId: string;
  let projectId: string;
  let queueId: string;
  let adminToken: string;
  let jobId: string;
  let workerId: string;

  beforeAll(async () => {
    // 1. Create Org & User
    const org = await prisma.organization.create({
      data: { name: 'Int Test Org ' + crypto.randomUUID(), slug: 'int-test-org-' + crypto.randomUUID() }
    });
    orgId = org.id;

    const user = await prisma.user.create({
      data: {
        email: `test-${crypto.randomUUID()}@example.com`,
        passwordHash: 'dummy',
        name: 'Test Admin',
        role: 'ADMIN',
        orgId
      }
    });

    adminToken = signToken({
      userId: user.id,
      email: user.email,
      orgId: user.orgId,
      role: user.role,
    });

    // 2. Create Project & Queue
    const project = await prisma.project.create({
      data: { name: 'Int Test Project', orgId }
    });
    projectId = project.id;

    const queue = await prisma.queue.create({
      data: {
        name: 'Int Test Queue',
        projectId,
        priority: 1,
        concurrencyLimit: 2,
        retryStrategy: RetryStrategy.FIXED,
        maxRetries: 3,
        retryDelayMs: 1000
      }
    });
    queueId = queue.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.jobExecution.deleteMany({ where: { job: { queueId } } });
    await prisma.jobLog.deleteMany({ where: { job: { queueId } } });
    await prisma.job.deleteMany({ where: { queueId } });
    await prisma.queue.delete({ where: { id: queueId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.user.deleteMany({ where: { orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.worker.deleteMany();
    await prisma.$disconnect();
  });

  it('1. Should create a new job via API', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        queueId,
        name: 'Integration Job 1',
        payload: { test: true },
        jobType: JobType.IMMEDIATE
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(JobStatus.QUEUED);
    expect(res.body.data.name).toBe('Integration Job 1');
    jobId = res.body.data.id;
  });

  it('2. Should register a worker via API', async () => {
    const res = await request(app)
      .post('/api/workers/register')
      .send({
        hostname: 'test-host',
        pid: 1234
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(WorkerStatus.ONLINE);
    workerId = res.body.data.id;
  });

  it('3. Worker should claim the job', async () => {
    const res = await request(app)
      .post('/api/jobs/worker/claim')
      .send({
        queueId,
        workerId
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.job.id).toBe(jobId);
    expect(res.body.data.job.status).toBe(JobStatus.CLAIMED);
    expect(res.body.data.execution.attemptNumber).toBe(1);
  });

  it('4. Worker should add a log to the job', async () => {
    const res = await request(app)
      .post(`/api/jobs/worker/${jobId}/log`)
      .send({
        level: 'INFO',
        message: 'Processing started'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('5. Worker should complete the job', async () => {
    const res = await request(app)
      .post(`/api/jobs/worker/${jobId}/complete`)
      .send({
        workerId
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify DB state
    const jobInDb = await prisma.job.findUnique({ where: { id: jobId } });
    expect(jobInDb?.status).toBe(JobStatus.COMPLETED);
  });
});
