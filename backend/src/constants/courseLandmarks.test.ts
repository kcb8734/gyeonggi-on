import assert from 'node:assert/strict';
import { test } from 'node:test';
import { landmarkFor, resolveCourseCity, withCouponComingSoon } from './courseLandmarks';
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

test('경기도 광주시 is not 광주광역시', () => {
  assert.equal(
    resolveCourseCity({
      title: '원조할매보리밥',
      address: '경기도 광주시 새말길 328 (신현동)',
      metro: 'GYEONGGI',
      latitude: 37.352,
      longitude: 127.331,
    }),
    '광주시',
  );
  assert.match(
    landmarkFor('history', undefined, '경기도 광주시 새말길 328', '원조할매보리밥', {
      metro: 'GYEONGGI',
      latitude: 37.352,
      longitude: 127.331,
    }).name,
    /남한산성|경기도자/,
  );
  assert.match(
    landmarkFor('camp', undefined, '경기도 광주시 새말길 328', '원조할매보리밥', {
      metro: 'GYEONGGI',
    }).name,
    /화담숲|곤지암/,
  );
});

test('광주광역시 kimchi festival stays in metro Gwangju', () => {
  assert.equal(
    resolveCourseCity({ title: '광주김치축제', address: '광주광역시 서구', metro: 'GWANGJU' }),
    '광주광역시',
  );
  assert.match(
    landmarkFor('history', undefined, '광주광역시', '광주김치축제', { metro: 'GWANGJU' }).name,
    /아시아문화전당|양림/,
  );
});

test('남양주 is not 양주, and 고성 homonyms split', () => {
  assert.equal(resolveCourseCity({ address: '경기도 남양주시', metro: 'GYEONGGI' }), '남양주');
  assert.match(landmarkFor('history', undefined, '경기도 남양주시').name, /수종사|정약용/);
  assert.equal(resolveCourseCity({ address: '경기도 양주시', metro: 'GYEONGGI' }), '양주');
  assert.equal(resolveCourseCity({ address: '강원특별자치도 고성군', metro: 'GANGWON' }), '고성강원');
  assert.equal(resolveCourseCity({ address: '경상남도 고성군', metro: 'GYEONGNAM' }), '고성경남');
});

test('coupon usage copy becomes coming soon', () => {
  assert.match(withCouponComingSoon('현장 가맹점에서 On&On+ 쿠폰을 사용합니다.'), /추후 준비/);
  assert.doesNotMatch(withCouponComingSoon('떡갈비·주먹밥을 쿠폰으로 결제합니다.'), /쿠폰으로 결제/);
});
