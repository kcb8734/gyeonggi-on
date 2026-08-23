import assert from 'node:assert/strict';
import { test } from 'node:test';
import { landmarkFor, resolveCourseCity } from './courseLandmarks';
import { regionById } from './regionTour';

test('history landmark is a real place name', () => {
  const history = landmarkFor('history', '춘천');
  assert.match(history.name, /남이섬|경춘선/);
  assert.notEqual(history.name.includes('대표 역사 명소'), true);
  assert.ok(history.lat);
});

test('resolveCourseCity prefers festival title over suwon default', () => {
  assert.equal(resolveCourseCity({ title: '보령머드축제', metro: 'CHUNGCHEONG' }), '보령');
  assert.equal(resolveCourseCity({ title: '서귀포칠십리축제', metro: 'JEJU' }), '서귀포');
  assert.equal(resolveCourseCity({ metro: 'SEOUL' }), '서울');
});

test('region festivals resolve to local landmarks', () => {
  assert.match(landmarkFor('history', undefined, undefined, '보령머드축제').name, /성주사|대천/);
  assert.match(landmarkFor('market', undefined, undefined, '여수밤바다불꽃축제').name, /교동시장/);
  assert.match(landmarkFor('history', undefined, undefined, '제주들불축제').name, /삼성혈|관덕정/);
  assert.match(landmarkFor('market', undefined, undefined, '부산불꽃축제').name, /자갈치/);
  assert.notEqual(landmarkFor('history', undefined, undefined, '청주직지축제').name, '수원화성행궁');
});

test('gangwon region maps to tour area 32', () => {
  const region = regionById('GANGWON');
  assert.equal(region.code, '32');
  assert.equal(region.officialMatching, false);
  assert.equal(region.label, '강원온');
});
