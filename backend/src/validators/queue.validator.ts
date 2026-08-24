import { z } from 'zod';

export const createQueueSchema = z.object({
  projectId: z.string().min(1, 'Project ID required'),
  name: z.string().min(1, 'Queue name required').max(100),
  description: z.string().optional(),
  priority: z.number().int().min(0).max(100).default(0),
  concurrencyLimit: z.number().int().min(1).max(100).default(5),
  retryStrategy: z.enum(['FIXED', 'LINEAR', 'EXPONENTIAL']).default('EXPONENTIAL'),
  maxRetries: z.number().int().min(0).max(20).default(3),
  retryDelayMs: z.number().int().min(100).max(3600000).default(5000),
});

export const updateQueueSchema = createQueueSchema.partial().omit({ projectId: true });

export type CreateQueueInput = z.infer<typeof createQueueSchema>;
export type UpdateQueueInput = z.infer<typeof updateQueueSchema>;
