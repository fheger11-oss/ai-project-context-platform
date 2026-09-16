export type UsagePeriod = {
  startsAt: Date;
  resetAt: Date;
};

export function utcCalendarMonthPeriod(now = new Date()): UsagePeriod {
  return {
    startsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0)),
    resetAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))
  };
}
