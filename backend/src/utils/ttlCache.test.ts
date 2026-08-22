import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TtlCache } from './ttlCache';

test('TtlCache stores and returns values before expiry', () => {
  const cache = new TtlCache(1000, () => 1_000);
  cache.set('festivals', [{ id: 1 }]);
  assert.deepEqual(cache.get('festivals'), [{ id: 1 }]);
  assert.equal(cache.size(), 1);
});

test('TtlCache expires entries after ttl', () => {
  let now = 1_000;
  const cache = new TtlCache(50, () => now);
  cache.set('nearby', { count: 2 }, 50);
  assert.deepEqual(cache.get('nearby'), { count: 2 });
  now = 1_051;
  assert.equal(cache.get('nearby'), undefined);
  assert.equal(cache.size(), 0);
});

test('TtlCache.wrap returns cached value without calling loader again', async () => {
  let loads = 0;
  const cache = new TtlCache(1_000, () => 10);
  const first = await cache.wrap('detail:1', async () => {
    loads += 1;
    return { title: '수원화성' };
  });
  const second = await cache.wrap('detail:1', async () => {
    loads += 1;
    return { title: '다른 값' };
  });
  assert.deepEqual(first, { title: '수원화성' });
  assert.deepEqual(second, { title: '수원화성' });
  assert.equal(loads, 1);
});
