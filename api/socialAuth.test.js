import assert from 'node:assert/strict';
import { test } from 'node:test';
import { socialLogin } from './socialAuth.js';

test('kakao without token is 400', async () => {
  await assert.rejects(() => socialLogin('kakao', {}), (err) => {
    assert.equal(err.status, 400);
    return true;
  });
});

test('google without code or token is 400', async () => {
  await assert.rejects(() => socialLogin('google', {}), (err) => {
    assert.equal(err.status, 400);
    return true;
  });
});

test('kakao demo token issues a session', async () => {
  const data = await socialLogin('kakao', { access_token: 'demo' });
  assert.equal(data.user.provider, 'kakao');
  assert.equal(data.user.nickname, '카카오 온앤온+');
  assert.ok(data.accessToken);
  assert.ok(data.refreshToken);
});

test('google demo token issues a session', async () => {
  const data = await socialLogin('google', { access_token: 'demo' });
  assert.equal(data.user.provider, 'google');
  assert.ok(data.accessToken);
});

test('google code without server secret is 500', async () => {
  const prevId = process.env.GOOGLE_CLIENT_ID;
  const prevSecret = process.env.GOOGLE_CLIENT_SECRET;
  const prevExpo = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = '';
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = '';
  process.env.GOOGLE_CLIENT_SECRET = '';
  try {
    await assert.rejects(
      () => socialLogin('google', { code: 'fake', redirect_uri: 'https://www.kdanji.com/auth' }),
      (err) => {
        assert.equal(err.status, 500);
        assert.match(String(err.message), /GOOGLE_CLIENT_SECRET/);
        return true;
      },
    );
  } finally {
    if (prevId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = prevId;
    if (prevSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = prevSecret;
    if (prevExpo === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    else process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = prevExpo;
  }
});
