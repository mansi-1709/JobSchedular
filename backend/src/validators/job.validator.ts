import { z } from 'zod';

const payloadSchema = z.record(z.unknown()).optional().default({});

export const createJobSchema = z.object({
  queueId: z.string().min(1, 'Queue ID required'),
  name: z.string().min(1, 'Job name required').max(200),
  payload: payloadSchema,
  jobType: z.enum(['IMMEDIATE', 'DELAYED', 'SCHEDULED', 'RECURRING', 'BATCH']).default('IMMEDIATE'),
  priority: z.number().int().min(0).max(100).default(0),
  scheduledAt: z.string().datetime().optional(),
  cronExpression: z.string().optional(),
  maxRetries: z.number().int().min(0).max(20).optional(),
  retryStrategy: z.enum(['FIXED', 'LINEAR', 'EXPONENTIAL']).optional(),
  retryDelayMs: z.number().int().min(100).optional(),
  batchId: z.string().optional(),
});

export const createBatchJobsSchema = z.object({
  jobs: z.array(createJobSchema).min(1).max(100),
});

export const updateJobSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  payload: payloadSchema,
  priority: z.number().int().min(0).max(100).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const jobQuerySchema = z.object({
  status: z.string().optional(),
  queueId: z.string().optional(),
  jobType: z.string().optional(),
  priority: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type CreateBatchJobsInput = z.infer<typeof createBatchJobsSchema>;
export type JobQueryInput = z.infer<typeof jobQuerySchema>;
