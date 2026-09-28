import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  loadStoredSummary,
  normalizeIdentity,
  resetAiSummaryTableFlag,
  rowToSummary,
  saveStoredSummary,
} from './festivalAiStore.js';

function fakePool(existing = []) {
  const rows = existing.slice();
  const statements = [];
  return {
    rows,
    statements,
    async query(sql, params = []) {
      statements.push({ sql: String(sql), params });
      if (/CREATE TABLE|CREATE INDEX/i.test(sql)) return { rowCount: 0, rows: [] };
      if (/SELECT/i.test(sql)) {
        const cacheKey = params[0];
        const titleNorm = params[1];
        const metro = params[2];
        const matched = rows.filter((row) => (
          row.cache_key === cacheKey
          || (row.title_norm === titleNorm && row.metro === metro)
          || (row.title_norm === titleNorm && metro === '')
        ));
        return { rowCount: matched.length, rows: matched };
      }
      if (/INSERT/i.test(sql)) {
        const row = {
          cache_key: params[0],
          title: params[1],
          title_norm: params[2],
          place: params[3],
          start_date: params[4],
          end_date: params[5],
          metro: params[6],
          overview: params[7],
          highlights: JSON.parse(params[8]),
          tips: params[9],
          model: params[10],
          source: 'gemini',
        };
        const idx = rows.findIndex((item) => item.cache_key === row.cache_key);
        if (idx >= 0) rows[idx] = row;
        else rows.push(row);
        return { rowCount: 1, rows: [row] };
      }
      return { rowCount: 0, rows: [] };
    },
  };
}

test('팝업 주소와 상세 주소는 같은 저장 키를 쓴다', () => {
  const popup = normalizeIdentity({ title: '파주 장단콩축제', place: '파주시', metro: 'GYEONGGI' });
  const detail = normalizeIdentity({
    title: '파주 장단콩축제',
    place: '경기도 파주시 임진각로 148-40',
    startDate: '2026-11-14',
    metro: 'gyeonggi',
  });
  assert.equal(popup.cacheKey, detail.cacheKey);
  assert.equal(popup.cacheKey, '파주 장단콩축제|GYEONGGI');
});

test('저장된 행을 상세보기 카드 형태로 되돌린다', () => {
  const summary = rowToSummary({
    overview: '장단콩 상세',
    highlights: ['첫째', '둘째', '셋째'],
    tips: '편한 신발',
    model: 'gemini-flash-latest',
  });
  assert.equal(summary.stored, true);
  assert.equal(summary.cached, true);
  assert.equal(summary.source, 'gemini');
  assert.equal(summary.highlights.length, 3);
});

test('Gemini 상세만 저장하고 같은 축제는 재사용한다', async () => {
  resetAiSummaryTableFlag();
  const pool = fakePool();
  const saved = await saveStoredSummary({
    title: '파주 장단콩축제',
    place: '파주시',
    metro: 'GYEONGGI',
  }, {
    source: 'gemini',
    overview: '장단콩 상세 개요',
    highlights: ['핵심1', '핵심2', '핵심3'],
    tips: '대중교통을 이용하세요.',
    model: 'gemini-flash-latest',
  }, { pool });
  assert.equal(saved, true);
  assert.equal(pool.rows.length, 1);

  const skipped = await saveStoredSummary({
    title: '파주 장단콩축제',
    metro: 'GYEONGGI',
  }, {
    source: 'fallback',
    overview: '로컬 안내',
    highlights: ['a', 'b', 'c'],
    tips: '팁',
  }, { pool });
  assert.equal(skipped, false);
  assert.equal(pool.rows.length, 1);

  const loaded = await loadStoredSummary({
    title: '파주 장단콩축제',
    place: '경기도 파주시 임진각로',
    startDate: '2026-11-14',
    metro: 'GYEONGGI',
  }, { pool });
  assert.equal(loaded.overview, '장단콩 상세 개요');
  assert.equal(loaded.stored, true);
  assert.equal(loaded.source, 'gemini');
});
