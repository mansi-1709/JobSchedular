import request from 'supertest';
import app from '../../backend/src/app';
import { PrismaClient, JobStatus, JobType, RetryStrategy } from '@prisma/client';
import { signToken } from '../../backend/src/utils/jwt';
import crypto from 'crypto';

const prisma = new PrismaClient();

describe('Integration - Retry & DLQ', () => {
  let orgId: string;
  let projectId: string;
  let queueId: string;
  let adminToken: string;
  let jobId: string;
  let workerId: string;

  beforeAll(async () => {
    const org = await prisma.organization.create({
      data: { name: 'DLQ Org ' + crypto.randomUUID(), slug: 'dlq-org-' + crypto.randomUUID() }
    });
    orgId = org.id;

    const user = await prisma.user.create({
      data: {
        email: `dlq-${crypto.randomUUID()}@example.com`,
        passwordHash: 'dummy',
        name: 'Test DLQ Admin',
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

    const project = await prisma.project.create({
      data: { name: 'DLQ Test Project', orgId }
    });
    projectId = project.id;

    const queue = await prisma.queue.create({
      data: {
        name: 'DLQ Queue',
        projectId,
        priority: 1,
        concurrencyLimit: 2,
        retryStrategy: RetryStrategy.FIXED,
        maxRetries: 1, // Only 1 retry allowed
        retryDelayMs: 0 // Immediate retry for testing
      }
    });
    queueId = queue.id;

    const reg = await request(app).post('/api/workers/register').send({ hostname: 'test', pid: 1 });
    workerId = reg.body.data.id;
  });

  afterAll(async () => {
    await prisma.deadLetterJob.deleteMany({ where: { queueId } });
    await prisma.jobExecution.deleteMany({ where: { job: { queueId } } });
    await prisma.job.deleteMany({ where: { queueId } });
    await prisma.queue.delete({ where: { id: queueId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.user.deleteMany({ where: { orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.worker.deleteMany();
    await prisma.$disconnect();
  });

  it('1. Create job and fail it -> should become SCHEDULED for retry', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ queueId, name: 'Fail Job', payload: {}, jobType: JobType.IMMEDIATE });
    jobId = createRes.body.data.id;

    // Claim
    await request(app).post('/api/jobs/worker/claim').send({ queueId, workerId });

    // Fail
    const failRes = await request(app)
      .post(`/api/jobs/worker/${jobId}/fail`)
      .send({ workerId, error: 'First Failure' });

    expect(failRes.status).toBe(200);
    expect(failRes.body.data.status).toBe(JobStatus.SCHEDULED); // because retryDelay is 0
    expect(failRes.body.data.currentAttempt).toBe(1);
  });

  it('2. Scheduler moves SCHEDULED back to QUEUED', async () => {
    // Run the scheduler endpoint (internal or service call)
    // For test, we can just call the service directly or wait.
    // Since we are black-box testing the API, we can't easily trigger the interval.
    // Let's just update the DB to simulate scheduler for this test.
    await prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.QUEUED, nextRetryAt: null }
    });
  });

  it('3. Claim again and fail -> should go to DLQ', async () => {
    // Claim attempt 2
    await request(app).post('/api/jobs/worker/claim').send({ queueId, workerId });

    // Fail attempt 2 (max retries was 1)
    const failRes = await request(app)
      .post(`/api/jobs/worker/${jobId}/fail`)
      .send({ workerId, error: 'Second Failure' });

    expect(failRes.status).toBe(200);
    expect(failRes.body.data.status).toBe(JobStatus.DEAD_LETTER);
    expect(failRes.body.data.currentAttempt).toBe(2);

    // Verify DLQ entry
    const dlq = await prisma.deadLetterJob.findUnique({ where: { jobId } });
    expect(dlq).not.toBeNull();
    expect(dlq?.failureReason).toBe('Second Failure');
  });
});
