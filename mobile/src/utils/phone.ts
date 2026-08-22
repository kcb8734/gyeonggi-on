/** TourAPI/안내문구에서 실제 걸 수 있는 전화번호만 뽑는다. */
export function extractDialNumber(raw?: string | null): string | null {
  if (!raw) return null;
  const text = String(raw).replace(/<[^>]+>/g, ' ');
  const match = text.match(/(?:\+82[-.\s]?)?0?\d{1,3}[-.\s)]+\d{3,4}[-.\s]+\d{4}|\b0\d{8,10}\b/);
  const source = match?.[0] ?? text;
  let digits = source.replace(/[^\d+]/g, '');
  if (digits.startsWith('+82')) digits = `0${digits.slice(3)}`;
  if (digits.startsWith('82') && digits.length >= 11) digits = `0${digits.slice(2)}`;
  if (digits.length < 8 || digits.length > 12) return null;
  return digits;
}

export function telHref(raw?: string | null): string | null {
  const digits = extractDialNumber(raw);
  return digits ? `tel:${digits}` : null;
}

export function formatTel(raw?: string | null): string {
  const digits = extractDialNumber(raw);
  if (!digits) return (raw || '').trim();
  if (digits.startsWith('02') && digits.length >= 9) {
    return `02-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
  }
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}
