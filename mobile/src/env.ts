function readPublic(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

const apiFromEnv =
  readPublic('EXPO_PUBLIC_API_URL')
  || readPublic('EXPO_PUBLIC_API_BASE_URL')
  || readPublic('EXPO_PUBLIC_API_BASE');

/** 배포(Vercel/kdanji.com)에서는 EXPO_PUBLIC_API_URL을 빌드 시 주입한다. */
export const API_BASE_URL = (apiFromEnv || 'https://api.gyeonggi-on.kr').replace(/\/$/, '');
export const WEB_ORIGIN = (readPublic('EXPO_PUBLIC_WEB_ORIGIN') || 'https://kdanji.com').replace(/\/$/, '');
export const KAKAO_CLIENT_ID = readPublic('EXPO_PUBLIC_KAKAO_CLIENT_ID');
export const GOOGLE_CLIENT_ID = readPublic('EXPO_PUBLIC_GOOGLE_CLIENT_ID');

export const PUBLIC_ENV = {
  EXPO_PUBLIC_API_URL: API_BASE_URL,
  EXPO_PUBLIC_WEB_ORIGIN: WEB_ORIGIN,
  EXPO_PUBLIC_KAKAO_CLIENT_ID: KAKAO_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
};
