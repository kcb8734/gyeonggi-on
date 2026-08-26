const KEY = 'onandon-center-applications';
let memory: string[] = [];

function read(): string[] {
  if (typeof localStorage === 'undefined') return memory;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return memory;
  }
}

export function listAppliedKeys(): string[] {
  return read();
}

export function rememberApplication(localityKey: string) {
  const next = [...new Set([...read(), localityKey])];
  memory = next;
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(next));
}
