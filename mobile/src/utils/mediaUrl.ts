export function secureMediaUrl(value?: string | null) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/^http:\/\//i, 'https://');
}
