import { registerSchema, loginSchema } from '../../backend/src/validators/auth.validator';
import { createJobSchema, createBatchJobsSchema } from '../../backend/src/validators/job.validator';
import { createQueueSchema, updateQueueSchema } from '../../backend/src/validators/queue.validator';

describe('Validator Schemas', () => {
  describe('Auth Validators', () => {
    it('should validate correct registration payload', () => {
      const valid = {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        password: 'password123',
        organizationName: 'Alice Org',
      };
      expect(() => registerSchema.parse(valid)).not.toThrow();
    });

    it('should reject invalid email or short password in registration', () => {
      expect(() => registerSchema.parse({ name: 'A', email: 'invalid-email', password: '123' })).toThrow();
    });

    it('should validate login payload', () => {
      expect(() => loginSchema.parse({ email: 'alice@example.com', password: 'pwd' })).not.toThrow();
      expect(() => loginSchema.parse({ email: 'not-an-email', password: '' })).toThrow();
    });
  });

  describe('Queue Validators', () => {
    it('should validate valid createQueue data with defaults', () => {
      const input = {
        projectId: 'proj_123',
        name: 'email-queue',
      };
      const result = createQueueSchema.parse(input);
      expect(result.concurrencyLimit).toBe(5);
      expect(result.retryStrategy).toBe('EXPONENTIAL');
      expect(result.maxRetries).toBe(3);
      expect(result.retryDelayMs).toBe(5000);
    });

    it('should reject invalid concurrency or retry limits', () => {
      expect(() => createQueueSchema.parse({ projectId: 'p1', name: 'q1', concurrencyLimit: 0 })).toThrow();
      expect(() => createQueueSchema.parse({ projectId: 'p1', name: 'q1', retryDelayMs: 10 })).toThrow();
    });

    it('should validate partial updateQueue data', () => {
      const updateData = { concurrencyLimit: 10, retryStrategy: 'LINEAR' as const };
      const parsed = updateQueueSchema.parse(updateData);
      expect(parsed.concurrencyLimit).toBe(10);
      expect(parsed.retryStrategy).toBe('LINEAR');
    });
  });

  describe('Job Validators', () => {
    it('should validate immediate job with defaults', () => {
      const parsed = createJobSchema.parse({
        queueId: 'q_123',
        name: 'Send Welcome Email',
      });
      expect(parsed.jobType).toBe('IMMEDIATE');
      expect(parsed.priority).toBe(0);
      expect(parsed.payload).toEqual({});
    });

    it('should validate batch jobs schema', () => {
      const batchData = {
        jobs: [
          { queueId: 'q1', name: 'Job 1' },
          { queueId: 'q1', name: 'Job 2' },
        ],
      };
      const parsed = createBatchJobsSchema.parse(batchData);
      expect(parsed.jobs.length).toBe(2);
    });

    it('should reject empty batch jobs', () => {
      expect(() => createBatchJobsSchema.parse({ jobs: [] })).toThrow();
    });
  });
});
