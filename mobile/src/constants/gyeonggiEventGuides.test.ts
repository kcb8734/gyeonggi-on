import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  extractHomepageUrl,
  gyeonggiEventCopy,
  isGenericFestivalOverview,
  resolveGyeonggiEventGuide,
} from './gyeonggiEventGuides';

test('세미원 연꽃문화제는 소개와 공식 링크를 준다', () => {
  const guide = resolveGyeonggiEventGuide('양평 세미원 연꽃문화제');
  assert.ok(guide);
  assert.match(guide.overview, /세미원/);
  assert.equal(guide.homepage, 'https://www.semiwon.or.kr');
});

test('경기온 미매칭 축제도 소개와 관광공사 검색 링크를 준다', () => {
  const copy = gyeonggiEventCopy('양주 회암사지 축제', undefined, 'GYEONGGI');
  assert.ok(copy);
  assert.match(copy.overview, /경기도/);
  assert.match(copy.homepage, /visitkorea/);
});

test('다른 권역은 경기 가이드를 강제하지 않는다', () => {
  assert.equal(gyeonggiEventCopy('제주들불축제', undefined, 'JEJU'), null);
});

test('TourAPI 껍데기 개요는 빈 소개로 본다', () => {
  assert.equal(isGenericFestivalOverview('현장 프로그램과 인근 전통시장·캠핑을 On&On+ 추천코스로 이을 수 있습니다.'), true);
  assert.equal(isGenericFestivalOverview('세미원에서 연꽃이 만개합니다.'), false);
});

test('홈페이지 HTML에서 URL을 뽑는다', () => {
  assert.equal(
    extractHomepageUrl('<a href="https://www.semiwon.or.kr">홈</a>'),
    'https://www.semiwon.or.kr',
  );
});
