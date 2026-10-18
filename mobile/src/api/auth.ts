import { api } from './client';
import { setAuthSession, type AuthUser } from '../stores/authStore';

interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  };
}

async function complete(
  provider: 'kakao' | 'google',
  payload: Record<string, string>,
): Promise<AuthUser> {
  const isDemo = payload.access_token === 'demo';
  try {
    const res = await api.post<AuthResponse>(`/api/auth/${provider}`, payload);
    if (res.data?.data?.user) {
      setAuthSession(res.data.data);
      return res.data.data.user;
    }
    if (!isDemo) {
      throw new Error(res.data?.message || '로그인에 실패했습니다.');
    }
  } catch (err: any) {
    if (!isDemo) {
      throw new Error(err?.response?.data?.message || err?.message || '로그인에 실패했습니다.');
    }
  }
  const user: AuthUser = {
    id: `preview-${provider}`,
    nickname: provider === 'kakao' ? '카카오 온앤온+' : '구글 온앤온+',
    avatarUrl: provider === 'kakao'
      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80'
      : 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&q=80',
    provider,
  };
  setAuthSession({
    user,
    accessToken: 'demo',
    refreshToken: 'demo-refresh',
  });
  return user;
}

export function loginWithKakaoToken(accessToken: string) {
  return complete('kakao', { access_token: accessToken });
}

export function loginWithGoogleToken(accessToken: string) {
  return complete('google', { access_token: accessToken });
}

export function loginWithGoogleCode(code: string, redirectUri: string) {
  return complete('google', { code, redirect_uri: redirectUri });
}
