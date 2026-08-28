import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  changeCoursePassword,
  hasCoursePassword,
  isCourseSessionUnlocked,
  registerCoursePassword,
  resetCoursePassword,
  unlockCourseSession,
  verifyCoursePassword,
} from './centerCourseAuth';

test('코스 비밀번호 등록·확인·변경·초기화', () => {
  const centerId = `TEST:${Date.now()}`;
  assert.equal(hasCoursePassword(centerId), false);
  const tooShort = registerCoursePassword(centerId, '12', '12');
  assert.equal(tooShort.ok, false);
  const mismatch = registerCoursePassword(centerId, 'abcd', 'abce');
  assert.equal(mismatch.ok, false);
  const registered = registerCoursePassword(centerId, 'abcd', 'abcd');
  assert.equal(registered.ok, true);
  assert.equal(hasCoursePassword(centerId), true);
  assert.equal(registerCoursePassword(centerId, 'efgh', 'efgh').ok, false);
  assert.equal(verifyCoursePassword(centerId, 'wrong').ok, false);
  assert.equal(verifyCoursePassword(centerId, 'abcd').ok, true);
  const changed = changeCoursePassword(centerId, 'abcd', 'wxyz', 'wxyz');
  assert.equal(changed.ok, true);
  assert.equal(verifyCoursePassword(centerId, 'abcd').ok, false);
  assert.equal(verifyCoursePassword(centerId, 'wxyz').ok, true);
  unlockCourseSession(centerId);
  assert.equal(isCourseSessionUnlocked(centerId), true);
  resetCoursePassword(centerId);
  assert.equal(hasCoursePassword(centerId), false);
  assert.equal(verifyCoursePassword(centerId, 'wxyz').ok, false);
});
