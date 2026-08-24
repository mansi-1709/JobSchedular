import { PrismaClient, UserRole, JobType, JobStatus, RetryStrategy, WorkerStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clean existing records (in reverse dependency order)
  await prisma.deadLetterJob.deleteMany();
  await prisma.jobLog.deleteMany();
  await prisma.jobExecution.deleteMany();
  await prisma.scheduledJob.deleteMany();
  await prisma.job.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workerHeartbeat.deleteMany();
  await prisma.worker.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 2. Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
    },
  });
  console.log(`✅ Created Organization: ${org.name} (${org.id})`);

  // 3. Users
  const passwordHashAdmin = await bcrypt.hash('admin123', 10);
  const passwordHashMember = await bcrypt.hash('dev123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      passwordHash: passwordHashAdmin,
      name: 'Admin User',
      role: UserRole.ADMIN,
      orgId: org.id,
    },
  });

  const member = await prisma.user.create({
    data: {
      email: 'developer@acme.com',
      passwordHash: passwordHashMember,
      name: 'Jane Developer',
      role: UserRole.MEMBER,
      orgId: org.id,
    },
  });
  console.log(`✅ Created Users: ${admin.email} (ADMIN), ${member.email} (MEMBER)`);

  // 4. Project
  const project = await prisma.project.create({
    data: {
      name: 'Production Core Engine',
      description: 'Core event processing and async worker queues',
      orgId: org.id,
    },
  });
  console.log(`✅ Created Project: ${project.name}`);

  // 5. Queues
  const emailQueue = await prisma.queue.create({
    data: {
      projectId: project.id,
      name: 'email-notifications',
      description: 'Transactional and marketing email dispatching',
      priority: 5,
      concurrencyLimit: 10,
      retryStrategy: RetryStrategy.EXPONENTIAL,
      maxRetries: 3,
      retryDelayMs: 3000,
    },
  });

  const imageQueue = await prisma.queue.create({
    data: {
      projectId: project.id,
      name: 'image-processing',
      description: 'Thumbnail generation and image watermark processing',
      priority: 10,
      concurrencyLimit: 4,
      retryStrategy: RetryStrategy.LINEAR,
      maxRetries: 2,
      retryDelayMs: 5000,
    },
  });

  const reportQueue = await prisma.queue.create({
    data: {
      projectId: project.id,
      name: 'reports-generator',
      description: 'Periodic billing & aggregation reports',
      priority: 2,
      concurrencyLimit: 2,
      retryStrategy: RetryStrategy.FIXED,
      maxRetries: 1,
      retryDelayMs: 2000,
    },
  });
  console.log(`✅ Created 3 Queues: email-notifications, image-processing, reports-generator`);

  // 6. Sample Jobs
  // Job 1: Immediate Queued Job
  await prisma.job.create({
    data: {
      queueId: emailQueue.id,
      name: 'Send Welcome Email to customer@example.com',
      payload: { to: 'customer@example.com', templateId: 'welcome-v2' },
      jobType: JobType.IMMEDIATE,
      status: JobStatus.QUEUED,
      priority: 5,
      maxRetries: 3,
      retryStrategy: RetryStrategy.EXPONENTIAL,
      retryDelayMs: 3000,
    },
  });

  // Job 2: Completed Job with Execution and Logs
  const completedJob = await prisma.job.create({
    data: {
      queueId: imageQueue.id,
      name: 'Generate avatar thumbnails for user_9921',
      payload: { userId: 'user_9921', formats: ['64x64', '256x256'] },
      jobType: JobType.IMMEDIATE,
      status: JobStatus.COMPLETED,
      priority: 10,
      currentAttempt: 1,
      maxRetries: 2,
    },
  });

  const exec = await prisma.jobExecution.create({
    data: {
      jobId: completedJob.id,
      attemptNumber: 1,
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 65000),
      completedAt: new Date(Date.now() - 62000),
      durationMs: 3000,
    },
  });

  await prisma.jobLog.createMany({
    data: [
      {
        jobId: completedJob.id,
        executionId: exec.id,
        level: 'INFO',
        message: 'Downloaded image from S3 in 420ms',
        timestamp: new Date(Date.now() - 64000),
      },
      {
        jobId: completedJob.id,
        executionId: exec.id,
        level: 'INFO',
        message: 'Thumbnails generated and uploaded successfully',
        timestamp: new Date(Date.now() - 62000),
      },
    ],
  });

  // Job 3: Recurring Scheduled Job (Cron)
  const cronJob = await prisma.job.create({
    data: {
      queueId: reportQueue.id,
      name: 'Daily Aggregated Revenue Summary',
      payload: { reportType: 'DAILY_REVENUE', sendToAdmin: true },
      jobType: JobType.RECURRING,
      status: JobStatus.SCHEDULED,
      cronExpression: '0 0 * * *',
      priority: 2,
    },
  });

  await prisma.scheduledJob.create({
    data: {
      jobId: cronJob.id,
      cronExpression: '0 0 * * *',
      nextRunAt: new Date(Date.now() + 86400000),
      lastRunAt: new Date(Date.now() - 3600000),
    },
  });

  // Job 4: Dead-Letter Job
  const dlqJob = await prisma.job.create({
    data: {
      queueId: emailQueue.id,
      name: 'Send Invoice Notification (Invalid SMTP)',
      payload: { invoiceId: 'inv_1092', recipient: 'finance@broken-domain.invalid' },
      jobType: JobType.IMMEDIATE,
      status: JobStatus.DEAD_LETTER,
      currentAttempt: 3,
      maxRetries: 3,
    },
  });

  await prisma.deadLetterJob.create({
    data: {
      jobId: dlqJob.id,
      queueId: emailQueue.id,
      failureReason: 'Max retry attempts exceeded',
      lastError: 'SMTPError: Connection timeout after 3 attempts to broken-domain.invalid',
      attemptCount: 3,
    },
  });

  // 7. Sample Worker Node
  await prisma.worker.create({
    data: {
      hostname: 'worker-primary-node-1',
      pid: 10452,
      status: WorkerStatus.ONLINE,
      lastHeartbeatAt: new Date(),
      startedAt: new Date(Date.now() - 3600000),
      jobsProcessed: 42,
      metadata: { concurrency: 4, nodeVersion: process.version },
    },
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
