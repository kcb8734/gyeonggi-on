import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkEmailChallenge, generateEmailCode, issueEmailChallenge, normalizeEmail } from './emailChallenge.js';

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  Pizon8113@Gmail.com '), 'pizon8113@gmail.com');
});

test('generateEmailCode is 6 digits', () => {
  assert.match(generateEmailCode(), /^\d{6}$/);
});

test('challenge verifies the same email and code', () => {
  const issued = issueEmailChallenge('pizon8113@gmail.com', '123456', 1_000_000);
  const ok = checkEmailChallenge('Pizon8113@gmail.com', '123456', issued.challenge, 1_000_100);
  assert.equal(ok.ok, true);
});

test('challenge rejects a wrong code', () => {
  const issued = issueEmailChallenge('pizon8113@gmail.com', '123456', 1_000_000);
  const bad = checkEmailChallenge('pizon8113@gmail.com', '000000', issued.challenge, 1_000_100);
  assert.equal(bad.ok, false);
});

test('challenge expires', () => {
  const issued = issueEmailChallenge('pizon8113@gmail.com', '123456', 1_000_000);
  const late = checkEmailChallenge('pizon8113@gmail.com', '123456', issued.challenge, issued.expiresAt + 1);
  assert.equal(late.ok, false);
  assert.match(String(late.reason), /만료/);
});
