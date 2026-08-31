import assert from 'node:assert/strict';
import { test } from 'node:test';
import { syncOpenCultureEvents } from './cultureOpenSync.js';

test('즉시 동기화는 키가 없어도 샘플을 적재하지 않는다', async () => {
  process.env.SEOUL_CULTURE_API_KEY = '';
  process.env.GG_CULTURE_API_KEY = '';
  process.env.INCHEON_API_KEY = '';
  process.env.IFAC_API_KEY = '';
  process.env.INCHEON_CULTURE_API_KEY = '';
  const result = await syncOpenCultureEvents({}, { budgetMs: 4000 });
  assert.equal(result.fallback, false);
  assert.notEqual(result.source, 'sample');
  assert.match(String(result.message || ''), /API|키|수집/);
  assert.doesNotMatch(String(result.message || ''), /샘플 52/);
  assert.ok(Array.isArray(result.sources));
});
