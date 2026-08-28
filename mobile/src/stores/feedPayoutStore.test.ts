import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  approveUserPoints,
  cityFromAddress,
  getFeedPayoutMode,
  listUserPointRecords,
  mergeFeedRewardRows,
  recordUserPoints,
  setFeedPayoutMode,
} from './feedPayoutStore';

const mem = new Map<string, string>();
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (key) => mem.get(key) ?? null,
  setItem: (key, value) => { mem.set(key, String(value)); },
  removeItem: (key) => { mem.delete(key); },
  clear: () => { mem.clear(); },
  key: (index) => [...mem.keys()][index] ?? null,
  get length() { return mem.size; },
} as Storage;

test('feed payout defaults to payable until admin marks blocked', () => {
  assert.equal(getFeedPayoutMode({ metro: 'GYEONGGI', city: '수원시' }), 'payable');
  setFeedPayoutMode({ metro: 'GYEONGGI', city: '수원시', mode: 'blocked' });
  assert.equal(getFeedPayoutMode({ metro: 'GYEONGGI', city: '수원시' }), 'blocked');
  assert.equal(getFeedPayoutMode({ metro: 'GYEONGGI', city: '수원시', festivalId: 'fest-1' }), 'blocked');
  setFeedPayoutMode({ metro: 'GYEONGGI', city: '화성시', mode: 'payable' });
  assert.equal(getFeedPayoutMode({ metro: 'GYEONGGI', city: '화성시' }), 'payable');
});

test('user point ledger records, approves, and merges', () => {
  const row = recordUserPoints({
    userName: '수원나들이',
    festival: '수원화성문화제',
    city: '수원시',
    regionalZone: 'GYEONGGI',
    points: 1000,
  });
  assert.equal(row.status, 'PENDING');
  assert.equal(listUserPointRecords()[0].id, row.id);
  approveUserPoints(row.id, 'PAID');
  assert.equal(listUserPointRecords()[0].status, 'PAID');
  const merged = mergeFeedRewardRows([{
    id: 'other',
    userName: '다른유저',
    festival: '여수밤바다불꽃축제',
    city: '여수시',
    regionalZone: 'JEONNAM',
    regionLabel: '전남온',
    amountWon: 1000,
    points: 1000,
    postedAt: '2026-08-15',
    status: 'PENDING',
  }]);
  assert.equal(merged[0].id, row.id);
  assert.ok(merged.some((item) => item.id === 'other'));
});

test('cityFromAddress matches locality tokens', () => {
  assert.equal(cityFromAddress('GYEONGGI', '경기도 수원시 팔달구 정조로 825'), '수원시');
});
