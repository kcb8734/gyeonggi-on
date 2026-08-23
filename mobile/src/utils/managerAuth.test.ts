import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  canSetManagerPassword,
  canSubmitEmailCode,
  isValidManagerEmail,
  isValidManagerPhone,
  normalizeEmailCode,
} from './managerAuth';

test('manager email and phone validation', () => {
  assert.equal(isValidManagerEmail('pizon8113@gmail.com'), true);
  assert.equal(isValidManagerEmail('bad'), false);
  assert.equal(isValidManagerPhone('031-228-0000'), true);
  assert.equal(isValidManagerPhone('123'), false);
});

test('email code is 6 digits only', () => {
  assert.equal(normalizeEmailCode('12 a-34 56'), '123456');
  assert.equal(canSubmitEmailCode('12345'), false);
  assert.equal(canSubmitEmailCode('123456'), true);
});

test('password setup rules', () => {
  assert.equal(canSetManagerPassword('ab', 'ab').ok, false);
  assert.equal(canSetManagerPassword('abcd', 'abce').ok, false);
  assert.equal(canSetManagerPassword('abcd', 'abcd').ok, true);
});
