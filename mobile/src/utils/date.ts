export function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const text = String(value).trim();
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) {
    const date = new Date(`${iso[1]}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const dotted = text.match(/(\d{4})[./](\d{1,2})[./](\d{1,2})/);
  if (dotted) {
    const ymd = `${dotted[1]}-${dotted[2].padStart(2, '0')}-${dotted[3].padStart(2, '0')}`;
    const date = new Date(`${ymd}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const digits = text.replace(/\D/g, '');
  if (digits.length >= 8) {
    const ymd = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    const date = new Date(`${ymd}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function festivalDateYmd(value?: string | Date | null): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return ymd(value);
  }
  const parsed = toDate(value == null ? null : String(value));
  return parsed ? ymd(parsed) : '';
}

export function formatRange(start?: string | null, end?: string | null): string {
  const from = festivalDateYmd(start);
  const to = festivalDateYmd(end);
  if (!from && !to) return '일정 미정';
  if (!to || to === from) return from || to;
  return `${from} ~ ${to}`;
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

export function overlapsDay(start?: string | null, end?: string | null, day?: string): boolean {
  const from = festivalDateYmd(start);
  const to = festivalDateYmd(end) || from;
  const key = festivalDateYmd(day);
  if (!from || !key) return false;
  return from <= key && to >= key;
}

export const EVENT_COLORS = ['#E0392A', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DB2777', '#0D9488'];

export function eventColor(index: number): string {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}
