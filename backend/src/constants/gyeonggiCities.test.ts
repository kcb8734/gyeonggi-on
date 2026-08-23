import assert from 'node:assert/strict';
import { test } from 'node:test';
import { municipalityFromAddress, municipalityRegionCode } from './gyeonggiCities';

test('municipalityFromAddress picks a Gyeonggi city', () => {
  assert.equal(municipalityFromAddress('경기도 수원시 팔달구 정조로 825'), '수원시');
  assert.equal(municipalityFromAddress('경기도 용인시 기흥구'), '용인시');
  assert.equal(municipalityFromAddress('서울특별시 중구'), '경기도');
  assert.equal(municipalityRegionCode('수원시'), 'GG_수원시');
});
