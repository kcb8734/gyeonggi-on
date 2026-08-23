import { useEffect, useState } from 'react';
import { readJson, writeJson } from '../utils/storage';

export interface FestivalManagerAccount {
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: string;
}

interface ManagerState {
  accounts: FestivalManagerAccount[];
  sessionEmail: string | null;
}

const KEY = 'onandon-festival-managers';
const INITIAL: ManagerState = { accounts: [], sessionEmail: null };
const loaded = readJson<Partial<ManagerState>>(KEY, INITIAL);
let state: ManagerState = {
  accounts: loaded.accounts ?? [],
  sessionEmail: loaded.sessionEmail ?? null,
};
type Listener = () => void;
const listeners = new Set<Listener>();

function emit(next: ManagerState) {
  state = next;
  writeJson(KEY, state);
  listeners.forEach((fn) => fn());
}

export function hashManagerPassword(value: string): string {
  let hash = 2166136261;
  const salt = `onandon-manager:${value.length}`;
  const input = `${salt}:${value}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}-${value.length}`;
}

export function getManagerState(): ManagerState {
  return state;
}

export function useManagerState(): ManagerState {
  const [value, setValue] = useState(state);
  useEffect(() => {
    const listen = () => setValue(getManagerState());
    listeners.add(listen);
    return () => {
      listeners.delete(listen);
    };
  }, []);
  return value;
}

export function registerFestivalManager(input: { email: string; phone: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const account: FestivalManagerAccount = {
    email,
    phone: input.phone.trim(),
    passwordHash: hashManagerPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  const accounts = [...state.accounts.filter((item) => item.email !== email), account];
  emit({ accounts, sessionEmail: email });
}

export function loginFestivalManager(email: string, password: string): { success: boolean; message: string } {
  const key = email.trim().toLowerCase();
  const account = state.accounts.find((item) => item.email === key);
  if (!account) return { success: false, message: '등록된 담당자 메일이 없습니다. 인증 후 비밀번호를 먼저 설정해주세요.' };
  if (account.passwordHash !== hashManagerPassword(password)) {
    return { success: false, message: '비밀번호가 올바르지 않습니다.' };
  }
  emit({ ...state, sessionEmail: account.email });
  return { success: true, message: `${account.email} 담당자로 로그인했습니다.` };
}

export function logoutFestivalManager() {
  emit({ ...state, sessionEmail: null });
}

export function getLoggedInManager(): FestivalManagerAccount | null {
  if (!state.sessionEmail) return null;
  return state.accounts.find((item) => item.email === state.sessionEmail) ?? null;
}
