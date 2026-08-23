import assert from 'node:assert/strict';
import { test } from 'node:test';
import { landmarkFor } from './courseLandmarks';
import { regionById } from './regionTour';

test('history landmark is a real place name', () => {
  const history = landmarkFor('history', '춘천');
  assert.match(history.name, /남이섬|경춘선/);
  assert.notEqual(history.name.includes('대표 역사 명소'), true);
  assert.ok(history.lat);
});

test('gangwon region maps to tour area 32', () => {
  const region = regionById('GANGWON');
  assert.equal(region.code, '32');
  assert.equal(region.officialMatching, false);
  assert.equal(region.label, '강원온');
});
