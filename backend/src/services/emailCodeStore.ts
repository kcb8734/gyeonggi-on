export interface EmailCodeRecord {
  email: string;
  code: string;
  expiresAt: number;
}

const TTL_MS = 3 * 60 * 1000;
const store = new Map<string, EmailCodeRecord>();

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function generateEmailCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function saveEmailCode(email: string, code: string, now = Date.now()): EmailCodeRecord {
  const record: EmailCodeRecord = {
    email: normalizeEmail(email),
    code: String(code).trim(),
    expiresAt: now + TTL_MS,
  };
  store.set(record.email, record);
  return record;
}

export function verifyEmailCode(email: string, code: string, now = Date.now()): { ok: boolean; reason?: string } {
  const key = normalizeEmail(email);
  const record = store.get(key);
  if (!record) return { ok: false, reason: '인증번호를 먼저 받아주세요.' };
  if (record.expiresAt < now) {
    store.delete(key);
    return { ok: false, reason: '인증번호가 만료되었습니다. 다시 받아주세요.' };
  }
  if (record.code !== String(code || '').trim()) {
    return { ok: false, reason: '인증번호가 일치하지 않습니다.' };
  }
  store.delete(key);
  return { ok: true };
}

export function clearEmailCodes() {
  store.clear();
}

export const EMAIL_CODE_TTL_MS = TTL_MS;
