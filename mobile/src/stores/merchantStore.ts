import { useEffect, useState } from 'react';
import { readJson, writeJson } from '../utils/storage';

export interface MerchantAccount {
  businessName: string;
  businessNumber: string;
  passwordHash: string;
  createdAt: string;
}

interface MerchantState {
  accounts: MerchantAccount[];
  sessionName: string | null;
}

const KEY = 'onandon-merchant-accounts';
const INITIAL: MerchantState = { accounts: [], sessionName: null };
const loaded = readJson<Partial<MerchantState>>(KEY, INITIAL);
let state: MerchantState = {
  accounts: loaded.accounts ?? [],
  sessionName: loaded.sessionName ?? null,
};
type Listener = () => void;
const listeners = new Set<Listener>();

function emit(next: MerchantState) {
  state = next;
  writeJson(KEY, state);
  listeners.forEach((fn) => fn());
}

export function hashMerchantPassword(value: string) {
  let hash = 2166136261;
  const input = `onandon-merchant:${value.length}:${value}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16)}-${value.length}`;
}

export function getMerchantState(): MerchantState {
  return state;
}

export function useMerchantState(): MerchantState {
  const [value, setValue] = useState(state);
  useEffect(() => {
    const listen = () => setValue(getMerchantState());
    listeners.add(listen);
    return () => {
      listeners.delete(listen);
    };
  }, []);
  return value;
}

export function registerMerchant(input: { businessName: string; businessNumber: string; password: string }) {
  const businessName = input.businessName.trim();
  const account: MerchantAccount = {
    businessName,
    businessNumber: input.businessNumber.replace(/\D/g, ''),
    passwordHash: hashMerchantPassword(input.password),
    createdAt: new Date().toISOString(),
  };
  const accounts = [...state.accounts.filter((item) => item.businessName !== businessName), account];
  emit({ accounts, sessionName: businessName });
}

export function loginMerchant(businessName: string, password: string): { success: boolean; message: string } {
  const key = businessName.trim();
  const account = state.accounts.find((item) => item.businessName === key);
  if (!account) return { success: false, message: '등록된 상호가 없습니다. 국세청 확인 후 비밀번호를 먼저 설정해주세요.' };
  if (account.passwordHash !== hashMerchantPassword(password)) {
    return { success: false, message: '비밀번호가 올바르지 않습니다.' };
  }
  emit({ ...state, sessionName: account.businessName });
  return { success: true, message: `${account.businessName} 사장님으로 로그인했습니다.` };
}

export function logoutMerchant() {
  emit({ ...state, sessionName: null });
}

export function getLoggedInMerchant(): MerchantAccount | null {
  if (!state.sessionName) return null;
  return state.accounts.find((item) => item.businessName === state.sessionName) ?? null;
}
