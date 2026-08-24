import cronParser from 'cron-parser';

export function getNextCronDate(expression: string, fromDate: Date = new Date()): Date {
  const interval = cronParser.parseExpression(expression, {
    currentDate: fromDate,
    tz: 'UTC',
  });
  return interval.next().toDate();
}

export function isValidCronExpression(expression: string): boolean {
  if (!expression || typeof expression !== 'string' || expression.trim().length === 0) {
    return false;
  }
  const parts = expression.trim().split(/\s+/);
  if (parts.length < 5 || parts.length > 6) {
    return false;
  }
  try {
    cronParser.parseExpression(expression.trim());
    return true;
  } catch {
    return false;
  }
}
