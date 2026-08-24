import { calculateRetryDelay, calculateNextRetryAt } from '../../backend/src/utils/backoff';
import { RetryStrategy } from '@prisma/client';

describe('Backoff Utility', () => {
  const baseDelay = 1000;

  describe('calculateRetryDelay', () => {
    it('should calculate FIXED delay correctly', () => {
      expect(calculateRetryDelay(RetryStrategy.FIXED, 1, baseDelay)).toBe(1000);
      expect(calculateRetryDelay(RetryStrategy.FIXED, 2, baseDelay)).toBe(1000);
      expect(calculateRetryDelay(RetryStrategy.FIXED, 5, baseDelay)).toBe(1000);
    });

    it('should calculate LINEAR delay correctly', () => {
      expect(calculateRetryDelay(RetryStrategy.LINEAR, 1, baseDelay)).toBe(1000);
      expect(calculateRetryDelay(RetryStrategy.LINEAR, 2, baseDelay)).toBe(2000);
      expect(calculateRetryDelay(RetryStrategy.LINEAR, 5, baseDelay)).toBe(5000);
    });

    it('should calculate EXPONENTIAL delay correctly', () => {
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 1, baseDelay)).toBe(1000); // 1000 * 2^0
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 2, baseDelay)).toBe(2000); // 1000 * 2^1
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 3, baseDelay)).toBe(4000); // 1000 * 2^2
      expect(calculateRetryDelay(RetryStrategy.EXPONENTIAL, 4, baseDelay)).toBe(8000); // 1000 * 2^3
    });

    it('should fallback to baseDelay for unknown strategy', () => {
      expect(calculateRetryDelay('UNKNOWN' as any, 3, baseDelay)).toBe(1000);
    });
  });

  describe('calculateNextRetryAt', () => {
    it('should return a Date in the future corresponding to delay', () => {
      const before = Date.now();
      const nextRetry = calculateNextRetryAt(RetryStrategy.FIXED, 1, 5000);
      const after = Date.now();

      expect(nextRetry).toBeInstanceOf(Date);
      expect(nextRetry.getTime()).toBeGreaterThanOrEqual(before + 5000);
      expect(nextRetry.getTime()).toBeLessThanOrEqual(after + 5000);
    });
  });
});
