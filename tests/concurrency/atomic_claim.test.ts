import { PrismaClient, JobStatus, JobType, RetryStrategy } from '@prisma/client';
import { claimNextJob } from '../../backend/src/repositories/job.repository';
import crypto from 'crypto';

const prisma = new PrismaClient();

describe('Concurrency - Atomic Job Claiming', () => {
  let queueId: string;
  let projectId: string;
  let orgId: string;

  beforeAll(async () => {
    // Setup test data
    const org = await prisma.organization.create({
      data: { name: 'Test Org ' + crypto.randomUUID(), slug: 'test-org-' + crypto.randomUUID() },
    });
    orgId = org.id;

    const project = await prisma.project.create({
      data: { name: 'Test Project', orgId },
    });
    projectId = project.id;

    const queue = await prisma.queue.create({
      data: {
        name: 'Concurrency Test Queue',
        projectId,
        priority: 1,
        concurrencyLimit: 10,
        retryStrategy: RetryStrategy.FIXED,
        maxRetries: 3,
        retryDelayMs: 1000,
      },
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
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear jobs in queue before each test
    await prisma.job.deleteMany({ where: { queueId } });
  });

  it('should not allow multiple workers to claim the same job', async () => {
    // 1. Create a single job
    await prisma.job.create({
      data: {
        queueId,
        name: 'Target Job',
        payload: { target: true },
        jobType: JobType.IMMEDIATE,
        status: JobStatus.QUEUED,
        priority: 1,
        maxRetries: 3,
        retryStrategy: RetryStrategy.FIXED,
        retryDelayMs: 1000,
      },
    });

    // 2. Simulate 10 workers trying to claim at the exact same time
    const workerIds = Array.from({ length: 10 }, (_, i) => `worker-${i}`);
    
    // We use Promise.all to fire them concurrently
    const claims = await Promise.all(
      workerIds.map((wId) => claimNextJob(queueId, wId))
    );

    // 3. Count how many successful claims
    const successfulClaims = claims.filter((claim) => claim !== null);

    // Assert only ONE worker got the job
    expect(successfulClaims.length).toBe(1);

    // Assert the other 9 workers got null
    const failedClaims = claims.filter((claim) => claim === null);
    expect(failedClaims.length).toBe(9);
  });
});
