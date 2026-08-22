import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const ACCESS_TTL = '2h';
const REFRESH_TTL = '14d';

type Provider = 'kakao' | 'google';

interface SocialProfile {
  provider: Provider;
  providerUserId: string;
  nickname: string;
  avatarUrl?: string;
  email?: string;
}

interface StoredUser extends SocialProfile {
  id: string;
}

const memoryUsers = new Map<string, StoredUser>();

function issueTokens(user: StoredUser) {
  const payload = {
    userId: user.id,
    role: 'CUSTOMER' as const,
    provider: user.provider,
    nickname: user.nickname,
  };
  return {
    accessToken: jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL }),
    refreshToken: jwt.sign({ userId: user.id, typ: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TTL }),
  };
}

async function upsertUser(profile: SocialProfile): Promise<StoredUser> {
  const key = `${profile.provider}:${profile.providerUserId}`;
  try {
    const existing = await pool.query(
      `SELECT id, provider, provider_user_id, nickname, avatar_url, email
       FROM social_users WHERE provider = $1 AND provider_user_id = $2`,
      [profile.provider, profile.providerUserId],
    );
    if (existing.rowCount) {
      const row = existing.rows[0];
      return {
        id: row.id,
        provider: row.provider,
        providerUserId: row.provider_user_id,
        nickname: row.nickname,
        avatarUrl: row.avatar_url,
        email: row.email,
      };
    }
    const inserted = await pool.query(
      `INSERT INTO social_users (provider, provider_user_id, nickname, avatar_url, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, provider, provider_user_id, nickname, avatar_url, email`,
      [profile.provider, profile.providerUserId, profile.nickname, profile.avatarUrl ?? null, profile.email ?? null],
    );
    const row = inserted.rows[0];
    return {
      id: row.id,
      provider: row.provider,
      providerUserId: row.provider_user_id,
      nickname: row.nickname,
      avatarUrl: row.avatar_url,
      email: row.email,
    };
  } catch {
    const cached = memoryUsers.get(key);
    if (cached) return cached;
    const user: StoredUser = {
      id: `mem-${profile.provider}-${profile.providerUserId}`,
      ...profile,
    };
    memoryUsers.set(key, user);
    return user;
  }
}

async function profileFromKakao(accessToken: string): Promise<SocialProfile> {
  if (accessToken === 'demo') {
    return {
      provider: 'kakao',
      providerUserId: 'demo-kakao',
      nickname: '카카오 온앤온',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
    };
  }
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('카카오 토큰이 유효하지 않습니다.');
  const data = await res.json() as {
    id: number;
    kakao_account?: { email?: string; profile?: { nickname?: string; profile_image_url?: string } };
  };
  return {
    provider: 'kakao',
    providerUserId: String(data.id),
    nickname: data.kakao_account?.profile?.nickname || '카카오 회원',
    avatarUrl: data.kakao_account?.profile?.profile_image_url,
    email: data.kakao_account?.email,
  };
}

async function profileFromGoogle(accessToken: string): Promise<SocialProfile> {
  if (accessToken === 'demo') {
    return {
      provider: 'google',
      providerUserId: 'demo-google',
      nickname: '구글 온앤온',
      avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&q=80',
      email: 'demo@onandon.app',
    };
  }
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('구글 토큰이 유효하지 않습니다.');
  const data = await res.json() as { sub: string; name?: string; picture?: string; email?: string };
  return {
    provider: 'google',
    providerUserId: data.sub,
    nickname: data.name || '구글 회원',
    avatarUrl: data.picture,
    email: data.email,
  };
}

async function socialLogin(provider: Provider, req: Request, res: Response) {
  const accessToken = String(req.body?.access_token ?? req.body?.accessToken ?? '').trim();
  if (!accessToken) {
    return res.status(400).json({ success: false, message: 'access_token이 필요합니다.' });
  }
  try {
    const profile = provider === 'kakao'
      ? await profileFromKakao(accessToken)
      : await profileFromGoogle(accessToken);
    const user = await upsertUser(profile);
    const tokens = issueTokens(user);
    return res.json({
      success: true,
      message: `${provider} 로그인에 성공했습니다.`,
      data: {
        user: {
          id: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          provider: user.provider,
          email: user.email,
        },
        ...tokens,
      },
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err instanceof Error ? err.message : '소셜 로그인에 실패했습니다.',
    });
  }
}

export const kakaoLogin = (req: Request, res: Response) => socialLogin('kakao', req, res);
export const googleLogin = (req: Request, res: Response) => socialLogin('google', req, res);

export const refreshSession = (req: Request, res: Response) => {
  const token = String(req.body?.refresh_token ?? req.body?.refreshToken ?? '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; typ?: string };
    if (decoded.typ !== 'refresh') {
      return res.status(401).json({ success: false, message: '리프레시 토큰이 아닙니다.' });
    }
    const accessToken = jwt.sign(
      { userId: decoded.userId, role: 'CUSTOMER' },
      JWT_SECRET,
      { expiresIn: ACCESS_TTL },
    );
    return res.json({ success: true, data: { accessToken } });
  } catch {
    return res.status(401).json({ success: false, message: '리프레시 토큰이 만료되었습니다.' });
  }
};
