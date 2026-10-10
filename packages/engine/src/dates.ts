const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function utcDate(startDate: string, day: number): Date {
  const [y, m, d] = startDate.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + day));
}

/** ISO date (YYYY-MM-DD) of a simulation day, counted from the start date. */
export function dateOf(startDate: string, day: number): string {
  return utcDate(startDate, day).toISOString().slice(0, 10);
}

/** Short label such as "29 Sep", independent of the runtime's locale. */
export function formatDay(startDate: string, day: number): string {
  const date = utcDate(startDate, day);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** When the day's reading is sent: 18:30 IST. */
export function readingTime(startDate: string, day: number): string {
  return `${dateOf(startDate, day)}T13:00:00.000Z`;
}
