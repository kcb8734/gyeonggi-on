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

async function complete(provider: 'kakao' | 'google', accessToken: string): Promise<AuthUser> {
  try {
    const res = await api.post<AuthResponse>(`/api/auth/${provider}`, { access_token: accessToken });
    if (res.data?.data) {
      setAuthSession(res.data.data);
      return res.data.data.user;
    }
  } catch {
    // 백엔드 미연결 시 미리보기 세션
  }
  const user: AuthUser = {
    id: `preview-${provider}`,
    nickname: provider === 'kakao' ? '카카오 온앤온' : '구글 온앤온',
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
  return complete('kakao', accessToken);
}

export function loginWithGoogleToken(accessToken: string) {
  return complete('google', accessToken);
}
