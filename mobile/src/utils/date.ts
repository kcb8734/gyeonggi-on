export function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function formatRange(start?: string | null, end?: string | null): string {
  if (!start) return '일정 미정';
  if (!end || end === start) return start.slice(0, 10);
  return `${start.slice(0, 10)} ~ ${end.slice(0, 10)}`;
}

/** 오늘 기준 D-day / 진행중 / 종료 */
export function ddayLabel(start?: string | null, end?: string | null, now = new Date()): string {
  const begin = toDate(start);
  if (!begin) return '';
  const finish = toDate(end) ?? begin;
  const today = startOfDay(now);
  if (today > startOfDay(finish)) return '종료';
  if (today >= startOfDay(begin)) return '진행중';
  const diff = Math.ceil((startOfDay(begin).getTime() - today.getTime()) / 86_400_000);
  return `D-${diff}`;
}

export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function overlapsDay(start?: string | null, end?: string | null, day?: string): boolean {
  if (!start || !day) return false;
  const from = start.slice(0, 10);
  const to = (end ?? start).slice(0, 10);
  return from <= day && to >= day;
}

export const EVENT_COLORS = ['#E0392A', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0D9488'];

export function eventColor(index: number): string {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}
