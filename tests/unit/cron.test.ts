import { getNextCronDate, isValidCronExpression } from '../../backend/src/utils/cron';

describe('Cron Utility', () => {
  describe('isValidCronExpression', () => {
    it('should return true for valid standard 5-part cron expressions', () => {
      expect(isValidCronExpression('* * * * *')).toBe(true);
      expect(isValidCronExpression('0 0 * * *')).toBe(true);
      expect(isValidCronExpression('*/5 * * * *')).toBe(true);
      expect(isValidCronExpression('0 12 1 * *')).toBe(true);
      expect(isValidCronExpression('30 4 1,15 * 5')).toBe(true);
    });

    it('should return false for invalid cron expressions', () => {
      expect(isValidCronExpression('invalid cron')).toBe(false);
      expect(isValidCronExpression('60 * * * *')).toBe(false); // minute out of range
      expect(isValidCronExpression('* * * * * * * *')).toBe(false);
      expect(isValidCronExpression('')).toBe(false);
    });
  });

  describe('getNextCronDate', () => {
    it('should return next date in the future for valid cron expression', () => {
      const fromDate = new Date('2026-01-01T00:00:00Z');
      // Every hour on the hour
      const next = getNextCronDate('0 * * * *', fromDate);
      expect(next).toBeInstanceOf(Date);
      expect(next.toISOString()).toBe('2026-01-01T01:00:00.000Z');
    });

    it('should throw error for invalid cron expression', () => {
      expect(() => {
        getNextCronDate('invalid cron');
      }).toThrow();
    });
  });
});
