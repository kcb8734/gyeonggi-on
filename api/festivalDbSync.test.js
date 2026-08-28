import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listPersistedFestivals, municipalityFromAddress, municipalityRegionCode, persistTourFestivals } from './festivalDbSync.js';

test('municipalityFromAddress maps Gyeonggi cities', () => {
  assert.equal(municipalityFromAddress('경기도 수원시 팔달구 정조로 825'), '수원시');
  assert.equal(municipalityFromAddress('경기도 용인시 기흥구'), '용인시');
  assert.equal(municipalityFromAddress('서울특별시 중구'), '경기도');
  assert.equal(municipalityRegionCode('수원시'), 'GG_수원시');
});

test('persistTourFestivals is a no-op without DATABASE_URL', async () => {
  const prev = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const result = await persistTourFestivals([
    { contentId: '1', title: '수원화성문화제', eventStartDate: '2026-08-21', address: '경기도 수원시' },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.upserted, 0);
  assert.match(result.message, /DATABASE_URL/);
  const listed = await listPersistedFestivals();
  assert.deepEqual(listed, []);
  if (prev !== undefined) process.env.DATABASE_URL = prev;
});
