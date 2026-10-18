function readPublic(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

const apiFromEnv =
  readPublic('EXPO_PUBLIC_API_URL')
  || readPublic('EXPO_PUBLIC_API_BASE_URL')
  || readPublic('EXPO_PUBLIC_API_BASE');

export const CANONICAL_ORIGIN = 'https://www.kdanji.com';

function extraApiUrl(): string {
  try {
    const Constants = require('expo-constants');
    const mod = Constants?.default ?? Constants;
    const extra = mod?.expoConfig?.extra || mod?.manifest?.extra || {};
    return String(extra.apiUrl || extra.EXPO_PUBLIC_API_URL || '').trim();
  } catch {
    return '';
  }
}

export function canonicalizeApiOrigin(url: string): string {
  const raw = String(url || '').trim().replace(/\/$/, '');
  if (!raw) return CANONICAL_ORIGIN;
  try {
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    if (parsed.hostname === 'kdanji.com') return CANONICAL_ORIGIN;
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, '');
  } catch {
    return CANONICAL_ORIGIN;
  }
}

function isBrowserHttpOrigin(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  const protocol = String(window.location.protocol || '');
  const host = String(window.location.hostname || '');
  return (protocol === 'http:' || protocol === 'https:') && Boolean(host);
}

/**
 * 개발 미리보기: 같은 출처 `/api` → Metro가 백엔드(4000)로 프록시.
 * 배포: 브라우저면 현재 출처(apex는 www로). 네이티브는 extra/env/www만 쓰고 apex 308을 피한다.
 */
function resolveApi(): string {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (isDev) {
    if (apiFromEnv) return canonicalizeApiOrigin(apiFromEnv);
    if (isBrowserHttpOrigin()) return '';
    return canonicalizeApiOrigin(extraApiUrl() || CANONICAL_ORIGIN);
  }
  if (isBrowserHttpOrigin()) {
    const host = window.location.hostname;
    if (host === 'kdanji.com') return CANONICAL_ORIGIN;
    return window.location.origin;
  }
  return canonicalizeApiOrigin(apiFromEnv || extraApiUrl() || CANONICAL_ORIGIN);
}

function resolveWebOrigin(): string {
  const fromEnv = readPublic('EXPO_PUBLIC_WEB_ORIGIN');
  if (isBrowserHttpOrigin() && window.location.hostname === 'kdanji.com') {
    return CANONICAL_ORIGIN;
  }
  if (fromEnv && fromEnv.includes('://kdanji.com') && !fromEnv.includes('www.')) {
    return CANONICAL_ORIGIN;
  }
  return fromEnv || CANONICAL_ORIGIN;
}

export const API_BASE_URL = resolveApi().replace(/\/$/, '');
export const WEB_ORIGIN = resolveWebOrigin().replace(/\/$/, '');
/** Metro는 process.env.EXPO_PUBLIC_* 멤버 접근만 빌드 시 인라인한다. process.env[name]은 웹 번들에서 빈 값이 된다. */
export const KAKAO_CLIENT_ID = String(
  process.env.EXPO_PUBLIC_KAKAO_CLIENT_ID
  || '04a0c5af1674ef99651907be51141277',
).trim();
export const GOOGLE_CLIENT_ID = String(
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID
  || '770194502672-b7ifu2bqbhs6mp8r0rstmkgnldnioq63.apps.googleusercontent.com',
).trim();

export const PUBLIC_ENV = {
  EXPO_PUBLIC_API_URL: API_BASE_URL,
  EXPO_PUBLIC_WEB_ORIGIN: WEB_ORIGIN,
  EXPO_PUBLIC_KAKAO_CLIENT_ID: KAKAO_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
};
