import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearEmailCodes, generateEmailCode, saveEmailCode, verifyEmailCode } from './emailCodeStore';

test('email code verifies within 3 minutes and expires after', () => {
  clearEmailCodes();
  const now = Date.now();
  const code = generateEmailCode();
  assert.match(code, /^\d{6}$/);
  saveEmailCode('Festival@suwon.go.kr', code, now);
  assert.equal(verifyEmailCode('festival@suwon.go.kr', code, now + 60_000).ok, true);
  saveEmailCode('Festival@suwon.go.kr', code, now);
  assert.equal(verifyEmailCode('festival@suwon.go.kr', code, now + 3 * 60 * 1000 + 1).ok, false);
});

test('wrong code fails without consuming a fresh unused flow incorrectly', () => {
  clearEmailCodes();
  const now = Date.now();
  saveEmailCode('a@b.co', '123456', now);
  assert.equal(verifyEmailCode('a@b.co', '000000', now).ok, false);
  assert.equal(verifyEmailCode('a@b.co', '123456', now).ok, true);
});
