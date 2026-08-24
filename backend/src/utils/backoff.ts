import { RetryStrategy } from '@prisma/client';

/**
 * Calculate the delay in milliseconds before the next retry attempt.
 *
 * FIXED:       delay = baseDelayMs (constant)
 * LINEAR:      delay = baseDelayMs * attemptNumber
 * EXPONENTIAL: delay = baseDelayMs * 2^(attemptNumber - 1)
 */
export function calculateRetryDelay(
  strategy: RetryStrategy,
  attemptNumber: number,
  baseDelayMs: number,
): number {
  switch (strategy) {
    case 'FIXED':
      return baseDelayMs;

    case 'LINEAR':
      return baseDelayMs * attemptNumber;

    case 'EXPONENTIAL':
      return baseDelayMs * Math.pow(2, attemptNumber - 1);

    default:
      return baseDelayMs;
  }
}

export function calculateNextRetryAt(
  strategy: RetryStrategy,
  attemptNumber: number,
  baseDelayMs: number,
): Date {
  const delayMs = calculateRetryDelay(strategy, attemptNumber, baseDelayMs);
  return new Date(Date.now() + delayMs);
}
