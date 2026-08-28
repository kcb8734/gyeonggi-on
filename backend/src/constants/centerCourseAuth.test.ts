import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  changeCoursePassword,
  hasCoursePassword,
  registerCoursePassword,
  resetCoursePassword,
  verifyCoursePassword,
} from './centerCourseAuth';

test('course password register verify change reset', () => {
  const centerId = `BE:${Date.now()}`;
  assert.equal(hasCoursePassword(centerId), false);
  assert.equal(registerCoursePassword(centerId, 'pass', 'pass').ok, true);
  assert.equal(verifyCoursePassword(centerId, 'pass').ok, true);
  assert.equal(changeCoursePassword(centerId, 'pass', 'next1', 'next1').ok, true);
  assert.equal(verifyCoursePassword(centerId, 'next1').ok, true);
  assert.equal(resetCoursePassword(centerId).ok, true);
  assert.equal(hasCoursePassword(centerId), false);
});
