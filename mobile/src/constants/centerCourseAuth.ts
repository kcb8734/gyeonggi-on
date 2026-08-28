const KEY = 'onandon-center-course-passwords';

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

function readMap(): Record<string, string> {
  if (typeof localStorage === 'undefined') return memoryPasswords;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...memoryPasswords, ...JSON.parse(raw) } : { ...memoryPasswords };
  } catch {
    return { ...memoryPasswords };
  }
}

const memoryPasswords: Record<string, string> = {};

function writeMap(map: Record<string, string>) {
  const next = { ...map };
  Object.keys(memoryPasswords).forEach((key) => { delete memoryPasswords[key]; });
  Object.assign(memoryPasswords, next);
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function hasCoursePassword(centerId: string) {
  return Boolean(readMap()[centerId]);
}

export function registerCoursePassword(centerId: string, password: string, confirm: string) {
  const pw = String(password || '').trim();
  if (pw.length < 4) return { ok: false as const, message: '비밀번호는 4자 이상이어야 합니다.' };
  if (pw !== String(confirm || '').trim()) return { ok: false as const, message: '비밀번호 확인이 일치하지 않습니다.' };
  if (hasCoursePassword(centerId)) return { ok: false as const, message: '이미 등록된 비밀번호가 있습니다.' };
  const map = readMap();
  map[centerId] = hashCoursePassword(pw);
  writeMap(map);
  return { ok: true as const };
}

export function verifyCoursePassword(centerId: string, password: string) {
  const saved = readMap()[centerId];
  if (!saved) return { ok: false as const, message: '등록된 비밀번호가 없습니다. 먼저 등록해 주세요.' };
  if (saved !== hashCoursePassword(password)) return { ok: false as const, message: '비밀번호가 올바르지 않습니다.' };
  return { ok: true as const };
}

export function changeCoursePassword(centerId: string, current: string, next: string, confirm: string) {
  const check = verifyCoursePassword(centerId, current);
  if (!check.ok) return check;
  const pw = String(next || '').trim();
  if (pw.length < 4) return { ok: false as const, message: '새 비밀번호는 4자 이상이어야 합니다.' };
  if (pw !== String(confirm || '').trim()) return { ok: false as const, message: '새 비밀번호 확인이 일치하지 않습니다.' };
  const map = readMap();
  map[centerId] = hashCoursePassword(pw);
  writeMap(map);
  return { ok: true as const };
}

export function resetCoursePassword(centerId: string) {
  const map = readMap();
  delete map[centerId];
  writeMap(map);
  return { ok: true as const };
}

export function setCoursePassword(centerId: string, password: string) {
  const map = readMap();
  map[centerId] = hashCoursePassword(password);
  writeMap(map);
}

const sessionUnlocked: Record<string, boolean> = {};

function sessionStore() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

export function isCourseSessionUnlocked(centerId: string) {
  if (sessionUnlocked[centerId]) return true;
  const raw = sessionStore()?.getItem(`${KEY}:session`);
  if (!raw) return false;
  try {
    return Boolean(JSON.parse(raw)[centerId]);
  } catch {
    return false;
  }
}

export function unlockCourseSession(centerId: string) {
  sessionUnlocked[centerId] = true;
  const store = sessionStore();
  if (!store) return;
  try {
    const current = JSON.parse(store.getItem(`${KEY}:session`) || '{}');
    current[centerId] = true;
    store.setItem(`${KEY}:session`, JSON.stringify(current));
  } catch {
    // memory only
  }
}

export function lockCourseSession(centerId: string) {
  delete sessionUnlocked[centerId];
  const store = sessionStore();
  if (!store) return;
  try {
    const current = JSON.parse(store.getItem(`${KEY}:session`) || '{}');
    delete current[centerId];
    store.setItem(`${KEY}:session`, JSON.stringify(current));
  } catch {
    // memory only
  }
}

export function hydrateCoursePasswords(rows: Record<string, string>) {
  writeMap({ ...readMap(), ...rows });
}
