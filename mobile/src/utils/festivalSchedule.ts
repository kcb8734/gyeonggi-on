/** YYYY-MM-DD 또는 ISO 문자열의 종료일 하루가 지났는지 확인합니다. */
export function isScheduleEnded(endDate?: string | null): boolean {
  if (!endDate) return false;
  const raw = endDate.includes('T') ? endDate : `${endDate}T23:59:59`;
  const end = new Date(raw);
  if (Number.isNaN(end.getTime())) return false;
  return Date.now() > end.getTime();
}

export function formatKoDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatKoDate(value?: string | null): string {
  if (!value) return '-';
  const raw = value.includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
}
