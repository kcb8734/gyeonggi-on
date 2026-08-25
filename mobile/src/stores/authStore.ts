import { useEffect, useState } from 'react';
import { readJson, writeJson } from '../utils/storage';

export interface AuthUser {
  id: string;
  nickname: string;
  avatarUrl?: string;
  provider: 'kakao' | 'google' | 'local';
  email?: string;
}

interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

const KEY = 'onandon-auth';
type Listener = () => void;
let session: AuthSession | null = readJson<AuthSession | null>(KEY, null);
const listeners = new Set<Listener>();

function emit(next: AuthSession | null) {
  session = next;
  writeJson(KEY, next);
  listeners.forEach((fn) => fn());
}

export function getAuthUser(): AuthUser | null {
  return session?.user ?? null;
}

export function getAccessToken(): string | null {
  return session?.accessToken ?? null;
}

export function useAuthUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(session?.user ?? null);
  useEffect(() => {
    const listen = () => setUser(getAuthUser());
    listeners.add(listen);
    return () => {
      listeners.delete(listen);
    };
  }, []);
  return user;
}

export function setAuthSession(next: AuthSession) {
  emit(next);
}

export function clearAuthSession() {
  emit(null);
}

export function updateAuthProfile(input: { nickname?: string; avatarUrl?: string }) {
  const nickname = (input.nickname ?? session?.user.nickname ?? '온앤온+').trim() || '온앤온+';
  const avatarUrl = input.avatarUrl ?? session?.user.avatarUrl;
  if (session) {
    emit({
      ...session,
      user: {
        ...session.user,
        nickname,
        avatarUrl,
      },
    });
    return;
  }
  emit({
    user: {
      id: 'local-profile',
      nickname,
      avatarUrl,
      provider: 'local',
    },
    accessToken: 'local',
    refreshToken: 'local',
  });
}
