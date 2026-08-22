function readPublic(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

const apiFromEnv =
  readPublic('EXPO_PUBLIC_API_URL')
  || readPublic('EXPO_PUBLIC_API_BASE_URL')
  || readPublic('EXPO_PUBLIC_API_BASE');

/**
 * 개발 미리보기: 같은 출처 `/api` → Metro가 백엔드(4000)로 프록시.
 * 배포: EXPO_PUBLIC_API_URL 또는 기본 API 호스트.
 */
const fallbackApi =
  typeof __DEV__ !== 'undefined' && __DEV__
    ? ''
    : 'https://kdanji.com';

export const API_BASE_URL = (apiFromEnv || fallbackApi).replace(/\/$/, '');
export const WEB_ORIGIN = (readPublic('EXPO_PUBLIC_WEB_ORIGIN') || 'https://kdanji.com').replace(/\/$/, '');
export const KAKAO_CLIENT_ID = readPublic('EXPO_PUBLIC_KAKAO_CLIENT_ID');
export const GOOGLE_CLIENT_ID = readPublic('EXPO_PUBLIC_GOOGLE_CLIENT_ID');

export const PUBLIC_ENV = {
  EXPO_PUBLIC_API_URL: API_BASE_URL,
  EXPO_PUBLIC_WEB_ORIGIN: WEB_ORIGIN,
  EXPO_PUBLIC_KAKAO_CLIENT_ID: KAKAO_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
};
