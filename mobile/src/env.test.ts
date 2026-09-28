import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonicalizeApiOrigin, CANONICAL_ORIGIN } from './env';
import {
  clearFestivalAiClientCache,
  festivalAiClientKey,
  localFestivalAiSummary,
  readFestivalAiClientCache,
  rememberFestivalAiClientCache,
} from './api/festivalAi';

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

test('팝업과 상세는 클라이언트에서도 같은 저장된 요약을 재사용한다', () => {
  clearFestivalAiClientCache();
  const popup = { title: '파주 장단콩축제', place: '파주시', metro: 'GYEONGGI' };
  const detail = {
    title: '파주 장단콩축제',
    place: '경기도 파주시 임진각로 148-40',
    startDate: '2026-11-14',
    metro: 'GYEONGGI',
  };
  assert.equal(festivalAiClientKey(popup), festivalAiClientKey(detail));
  rememberFestivalAiClientCache(popup, {
    overview: '저장된 장단콩 상세',
    highlights: ['1', '2', '3'],
    tips: '편한 신발',
    source: 'gemini',
  });
  const reused = readFestivalAiClientCache(detail);
  assert.equal(reused?.overview, '저장된 장단콩 상세');
  assert.equal(reused?.cached, true);
});
