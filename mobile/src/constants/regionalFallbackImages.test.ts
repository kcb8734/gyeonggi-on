import assert from 'node:assert/strict';
import { test } from 'node:test';
import { regionalFallbackUri, resolveFallbackKey } from './regionalFallbackKeys';

test('광주 서구·김치축제는 서구 폴백 키를 쓴다', () => {
  assert.equal(resolveFallbackKey('광주광역시 서구 상무대로 312', 'GWANGJU', '광주김치축제'), '서구');
  assert.match(regionalFallbackUri('광주광역시 서구', 'GWANGJU', '광주김치축제'), /서구|default_seogu|festival-fallback/);
});

test('권역 정보만 있으면 광역 폴백을 쓴다', () => {
  assert.equal(resolveFallbackKey('광주광역시', 'GWANGJU', '광주축제'), 'GWANGJU');
  assert.equal(resolveFallbackKey('', 'SEOUL', '서울거리예술축제'), 'SEOUL');
});

test('권역이 없으면 공통 폴백을 쓴다', () => {
  assert.equal(resolveFallbackKey('', '', ''), 'default');
});
