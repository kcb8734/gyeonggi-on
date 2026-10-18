import { createHmac, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { getPool } from './festivalDbSync.js';

const require = createRequire(import.meta.url);
const memoryUsers = new Map();

export function googleWebClientId() {
  return String(
    process.env.GOOGLE_CLIENT_ID
    || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID
    || '',
  ).trim();
}

function jwtSecret() {
  return String(process.env.JWT_SECRET || process.env.NTS_SERVICE_KEY || 'onandon-auth').trim();
}

function loadJwt() {
  const candidates = [
    'jsonwebtoken',
    path.join(process.cwd(), 'backend/node_modules/jsonwebtoken'),
  ];
  for (const id of candidates) {
    try {
      return require(id);
    } catch {
      // try next
    }
  }
  return null;
}

function signTokens(user) {
  const jwt = loadJwt();
  const secret = jwtSecret();
  if (jwt && jwt.sign) {
    return {
      accessToken: jwt.sign(
        { userId: user.id, role: 'CUSTOMER', provider: user.provider, nickname: user.nickname },
        secret,
        { expiresIn: '2h' },
      ),
      refreshToken: jwt.sign({ userId: user.id, typ: 'refresh' }, secret, { expiresIn: '14d' }),
    };
  }
  const payload = Buffer.from(JSON.stringify({
    userId: user.id,
    provider: user.provider,
    nickname: user.nickname,
    exp: Date.now() + 2 * 60 * 60 * 1000,
  })).toString('base64url');
  const mac = createHmac('sha256', secret).update(payload).digest('base64url');
  return { accessToken: `${payload}.${mac}`, refreshToken: `refresh.${user.id}` };
}

async function upsertUser(profile) {
  const key = `${profile.provider}:${profile.providerUserId}`;
  const pool = getPool();
  if (pool) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS social_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider VARCHAR(20) NOT NULL,
          provider_user_id VARCHAR(128) NOT NULL,
          nickname VARCHAR(80) NOT NULL,
          avatar_url TEXT,
          email VARCHAR(200),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (provider, provider_user_id)
        )
      `);
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
        [profile.provider, profile.providerUserId, profile.nickname, profile.avatarUrl || null, profile.email || null],
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
    } catch (err) {
      console.warn('[social-auth] db upsert', err && err.message ? err.message : err);
    }
  }
  const cached = memoryUsers.get(key);
  if (cached) return cached;
  const user = {
    id: randomUUID(),
    ...profile,
  };
  memoryUsers.set(key, user);
  return user;
}

export async function profileFromKakao(accessToken) {
  if (accessToken === 'demo') {
    return {
      provider: 'kakao',
      providerUserId: 'demo-kakao',
      nickname: '카카오 온앤온+',
    };
  }
  const res = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('카카오 토큰이 유효하지 않습니다.');
  const data = await res.json();
  return {
    provider: 'kakao',
    providerUserId: String(data.id),
    nickname: (data.kakao_account && data.kakao_account.profile && data.kakao_account.profile.nickname) || '카카오 회원',
    avatarUrl: data.kakao_account && data.kakao_account.profile && data.kakao_account.profile.profile_image_url,
    email: data.kakao_account && data.kakao_account.email,
  };
}

export async function exchangeGoogleCode(code, redirectUri) {
  const clientId = googleWebClientId();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    const error = new Error('구글 로그인 서버 설정(GOOGLE_CLIENT_SECRET)이 없습니다.');
    error.status = 500;
    throw error;
  }
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || '구글 코드를 토큰으로 바꾸지 못했습니다.');
  }
  return String(data.access_token);
}

export async function profileFromGoogle(accessToken) {
  if (accessToken === 'demo') {
    return {
      provider: 'google',
      providerUserId: 'demo-google',
      nickname: '구글 온앤온+',
      email: 'demo@onandon.app',
    };
  }
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('구글 토큰이 유효하지 않습니다.');
  const data = await res.json();
  return {
    provider: 'google',
    providerUserId: data.sub,
    nickname: data.name || '구글 회원',
    avatarUrl: data.picture,
    email: data.email,
  };
}

export async function socialLogin(provider, body) {
  const redirectUri = String(body.redirect_uri || body.redirectUri || 'https://www.kdanji.com/auth').trim();
  let accessToken = String(body.access_token || body.accessToken || '').trim();
  const code = String(body.code || '').trim();
  if (provider === 'google' && !accessToken && code) {
    accessToken = await exchangeGoogleCode(code, redirectUri);
  }
  if (!accessToken) {
    const error = new Error(provider === 'google' ? '구글 code 또는 access_token이 필요합니다.' : 'access_token이 필요합니다.');
    error.status = 400;
    throw error;
  }
  const profile = provider === 'kakao'
    ? await profileFromKakao(accessToken)
    : await profileFromGoogle(accessToken);
  const user = await upsertUser(profile);
  const tokens = signTokens(user);
  return {
    user: {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      email: user.email,
    },
    ...tokens,
  };
}
