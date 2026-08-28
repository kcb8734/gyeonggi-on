import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HomeFestival } from '../types/home';
import { forgetFestival, getAppState, rememberFestival } from './appStore';

test('forgetFestival removes a recently viewed festival', () => {
  const festival = {
    id: 'recent-test-1',
    title: '테스트 축제',
    location_name: '수원시',
    latitude: 37.28,
    longitude: 127.01,
  } as HomeFestival;
  rememberFestival(festival);
  assert.ok(getAppState().recent.some((item) => item.id === festival.id));
  forgetFestival(festival.id);
  assert.equal(getAppState().recent.some((item) => item.id === festival.id), false);
});
