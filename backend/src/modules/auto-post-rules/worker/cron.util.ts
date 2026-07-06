import { CronTime } from 'cron';

export function isValidCronExpression(expr: string): boolean {
  try {
    new CronTime(expr);
    return true;
  } catch {
    return false;
  }
}
