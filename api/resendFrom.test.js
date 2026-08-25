import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  RESEND_ACCOUNT_EMAIL,
  RESEND_DOMAIN_FROM,
  RESEND_TEST_FROM,
  resendFromCandidates,
  sendResendEmail,
} from './resendFrom.js';

test('resendFromCandidates keeps unique from addresses and prefers env', () => {
  const fromEnv = resendFromCandidates('Onandon <beth.t@example.com>');
  assert.equal(fromEnv[0], 'Onandon <beth.t@example.com>');
  assert.ok(fromEnv.includes(RESEND_TEST_FROM));
  assert.ok(fromEnv.includes(RESEND_ACCOUNT_EMAIL));
  assert.ok(fromEnv.includes(RESEND_DOMAIN_FROM));
  assert.equal(new Set(fromEnv).size, fromEnv.length);

  const empty = resendFromCandidates('  ');
  assert.equal(empty[0], RESEND_DOMAIN_FROM);
});

test('sendResendEmail retries the next from address after a domain error', async () => {
  const seen = [];
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body);
    seen.push(body.from);
    if (body.from !== RESEND_TEST_FROM) {
      return {
        ok: false,
        status: 403,
        async json() { return { message: 'The kdanji.com domain is not verified.' }; },
      };
    }
    return { ok: true, status: 200, async json() { return { id: 'ok' }; } };
  };
  const sent = await sendResendEmail({
    key: 're_test',
    to: RESEND_ACCOUNT_EMAIL,
    subject: 'code',
    html: '<p>1</p>',
    fetchImpl,
  });
  assert.equal(sent.ok, true);
  assert.equal(sent.from, RESEND_TEST_FROM);
  assert.ok(seen.length >= 2);
});
