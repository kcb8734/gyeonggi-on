const EMPTY = /^(null|undefined|-)?$/i;

/** 브라우저·RN Image가 실제로 열 수 있는 URL만 통과시킨다. asset:// 는 항상 404다. */
export function isUsableMediaUrl(value?: string | null): boolean {
  const raw = String(value || '').trim();
  if (!raw || EMPTY.test(raw) || raw.startsWith('asset://')) return false;
  return /^(https?:|data:|blob:|file:|content:)/i.test(raw);
}

export function secureMediaUrl(value?: string | null) {
  const raw = String(value || '').trim();
  if (!isUsableMediaUrl(raw)) return '';
  return raw.replace(/^http:\/\//i, 'https://');
}
