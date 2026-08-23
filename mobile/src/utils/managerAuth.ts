export function isValidManagerEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export function isValidManagerPhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 11;
}

export function normalizeEmailCode(value: string) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

export function canSubmitEmailCode(value: string) {
  return normalizeEmailCode(value).length === 6;
}

export function canSetManagerPassword(password: string, confirm: string) {
  const next = String(password || '');
  if (next.trim().length < 4) return { ok: false, message: '관리 비밀번호를 4자 이상 설정해 주세요.' };
  if (next !== confirm) return { ok: false, message: '비밀번호 확인이 일치하지 않습니다.' };
  return { ok: true, message: '' };
}
