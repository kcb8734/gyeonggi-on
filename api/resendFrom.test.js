import assert from 'node:assert/strict';
import { RESEND_ACCOUNT_EMAIL, RESEND_TEST_FROM, resendFromCandidates } from './resendFrom.js';

const fromEnv = resendFromCandidates('Onandon <beth.t@example.com>');
assert.equal(fromEnv[0], 'Onandon <beth.t@example.com>');
assert.ok(fromEnv.includes(RESEND_TEST_FROM));
assert.ok(fromEnv.includes(RESEND_ACCOUNT_EMAIL));
assert.ok(fromEnv.includes('Onandon <noreply@kdanji.com>'));
assert.equal(new Set(fromEnv).size, fromEnv.length);

const empty = resendFromCandidates('  ');
assert.equal(empty[0], 'Onandon <noreply@kdanji.com>');
assert.ok(empty.includes(RESEND_TEST_FROM));
assert.ok(empty.includes(RESEND_ACCOUNT_EMAIL));
