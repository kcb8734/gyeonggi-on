import { createHmac, timingSafeEqual } from 'crypto';

export const EMAIL_CODE_TTL_MS = 3 * 60 * 1000;

function secret(): string {
  return String(process.env.EMAIL_CODE_SECRET || process.env.NTS_SERVICE_KEY || 'onandon-email-code').trim();
}

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function generateEmailCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function issueEmailChallenge(email: string, code: string, now = Date.now()) {
  const exp = now + EMAIL_CODE_TTL_MS;
  const payload = `${normalizeEmail(email)}|${exp}|${String(code).trim()}`;
  const mac = createHmac('sha256', secret()).update(payload).digest('base64url');
  return { challenge: `${exp}.${mac}`, expiresAt: exp };
}

export function checkEmailChallenge(email: string, code: string, challenge: string, now = Date.now()) {
  const raw = String(challenge || '').trim();
  const sep = raw.indexOf('.');
  if (sep < 1) return { ok: false, reason: '인증번호를 먼저 받아주세요.' };
  const exp = Number(raw.slice(0, sep));
  const mac = raw.slice(sep + 1);
  if (!Number.isFinite(exp) || !mac) return { ok: false, reason: '인증번호를 먼저 받아주세요.' };
  if (exp < now) return { ok: false, reason: '인증번호가 만료되었습니다. 다시 받아주세요.' };
  const payload = `${normalizeEmail(email)}|${exp}|${String(code || '').trim()}`;
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
  const left = Buffer.from(mac);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return { ok: false, reason: '인증번호가 일치하지 않습니다.' };
  }
  return { ok: true };
}
