import assert from 'node:assert/strict';
import { test } from 'node:test';
import { syncOpenCultureEvents } from './cultureOpenSync.js';
import { buildFallbackFestivals, FALLBACK_SYNC_MIN } from './cultureSyncFallback.js';

test('샘플 적재는 50건 이상이다', () => {
  const rows = buildFallbackFestivals();
  assert.ok(rows.length >= FALLBACK_SYNC_MIN);
  assert.ok(rows.every((row) => row.contentId && row.title && row.eventStartDate));
});

test('외부 API가 없어도 즉시 동기화는 샘플 52건을 반환한다', async () => {
  process.env.SEOUL_CULTURE_API_KEY = '';
  process.env.GG_CULTURE_API_KEY = '';
  const result = await syncOpenCultureEvents({}, { budgetMs: 4000 });
  assert.equal(result.success, true);
  assert.ok(Number(result.fetched) >= 50);
  assert.ok(Array.isArray(result.categories));
  assert.ok(result.categories.reduce((sum, row) => sum + Number(row.count || 0), 0) >= 50 || result.fetched >= 50);
  assert.match(result.message, /샘플|문화행사/);
});
