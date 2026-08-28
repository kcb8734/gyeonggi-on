function fnv1a(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashCoursePassword(password: string) {
  const salt = `onandon+course|${String(password || '')}`;
  return `${fnv1a(salt)}${fnv1a([...salt].reverse().join(''))}`;
}

const PASSWORDS: Record<string, string> = {};

export function hasCoursePassword(centerId: string) {
  return Boolean(PASSWORDS[String(centerId || '')]);
}

export function registerCoursePassword(centerId: string, password: string, confirm: string) {
  const id = String(centerId || '').trim();
  const pw = String(password || '').trim();
  if (!id) return { ok: false as const, message: '지역을 확인할 수 없습니다.' };
  if (pw.length < 4) return { ok: false as const, message: '비밀번호는 4자 이상이어야 합니다.' };
  if (pw !== String(confirm || '').trim()) return { ok: false as const, message: '비밀번호 확인이 일치하지 않습니다.' };
  if (hasCoursePassword(id)) return { ok: false as const, message: '이미 등록된 비밀번호가 있습니다.' };
  PASSWORDS[id] = hashCoursePassword(pw);
  return { ok: true as const, hasPassword: true };
}

export function verifyCoursePassword(centerId: string, password: string) {
  const id = String(centerId || '').trim();
  const saved = PASSWORDS[id];
  if (!saved) return { ok: false as const, message: '등록된 비밀번호가 없습니다. 먼저 등록해 주세요.' };
  if (saved !== hashCoursePassword(password)) return { ok: false as const, message: '비밀번호가 올바르지 않습니다.' };
  return { ok: true as const, hasPassword: true };
}

export function changeCoursePassword(centerId: string, current: string, next: string, confirm: string) {
  const check = verifyCoursePassword(centerId, current);
  if (!check.ok) return check;
  const pw = String(next || '').trim();
  if (pw.length < 4) return { ok: false as const, message: '새 비밀번호는 4자 이상이어야 합니다.' };
  if (pw !== String(confirm || '').trim()) return { ok: false as const, message: '새 비밀번호 확인이 일치하지 않습니다.' };
  PASSWORDS[String(centerId || '').trim()] = hashCoursePassword(pw);
  return { ok: true as const, hasPassword: true };
}

export function resetCoursePassword(centerId: string) {
  const id = String(centerId || '').trim();
  if (!id) return { ok: false as const, message: '지역을 확인할 수 없습니다.' };
  delete PASSWORDS[id];
  return { ok: true as const, hasPassword: false };
}

export function courseAuth(body: {
  mode?: string;
  centerId?: string;
  password?: string;
  confirm?: string;
  currentPassword?: string;
  nextPassword?: string;
}) {
  const mode = String(body?.mode || '').trim();
  const centerId = String(body?.centerId || '').trim();
  if (!centerId) return { ok: false as const, message: '지역을 확인할 수 없습니다.' };
  if (mode === 'register') return registerCoursePassword(centerId, String(body.password || ''), String(body.confirm || ''));
  if (mode === 'login') return verifyCoursePassword(centerId, String(body.password || ''));
  if (mode === 'change') {
    return changeCoursePassword(
      centerId,
      String(body.currentPassword || ''),
      String(body.nextPassword || ''),
      String(body.confirm || ''),
    );
  }
  return { ok: false as const, message: '비밀번호 요청을 확인할 수 없습니다.' };
}
