import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonicalizeApiOrigin, CANONICAL_ORIGIN } from './env';
import { localFestivalAiSummary } from './api/festivalAi';

test('canonicalizeApiOrigin upgrades apex kdanji.com to www', () => {
  assert.equal(canonicalizeApiOrigin('https://kdanji.com'), CANONICAL_ORIGIN);
  assert.equal(canonicalizeApiOrigin('https://kdanji.com/'), CANONICAL_ORIGIN);
  assert.equal(canonicalizeApiOrigin('https://www.kdanji.com'), CANONICAL_ORIGIN);
  assert.equal(canonicalizeApiOrigin(''), CANONICAL_ORIGIN);
});

test('localFestivalAiSummary keeps the detail view usable offline', () => {
  const row = localFestivalAiSummary({
    title: '파주 장단콩축제',
    place: '경기도 파주시',
    startDate: '2026-11-14',
    endDate: '2026-11-16',
    metro: 'GYEONGGI',
    category: '먹거리',
  });
  assert.equal(row.source, 'fallback');
  assert.match(row.overview, /장단콩/);
  assert.equal(row.highlights.length, 3);
  assert.ok(row.tips.length > 10);
});
