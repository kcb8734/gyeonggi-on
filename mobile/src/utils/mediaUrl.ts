export function secureMediaUrl(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'null' || raw === 'undefined' || raw === '-' || raw.startsWith('asset://')) return '';
  return raw.replace(/^http:\/\//i, 'https://');
}
