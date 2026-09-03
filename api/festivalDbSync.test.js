import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clipFestivalTel, festivalDateYmd, festivalInsertPlaceholders, listedMetroForRow, listPersistedFestivals, mergeHomeFestivalRows, municipalityFromAddress, municipalityRegionCode, persistTourFestivals, rowMatchesMetro } from './festivalDbSync.js';

test('municipalityFromAddress maps Gyeonggi cities', () => {
  assert.equal(municipalityFromAddress('경기도 수원시 팔달구 정조로 825'), '수원시');
  assert.equal(municipalityFromAddress('경기도 용인시 기흥구'), '용인시');
  assert.equal(municipalityFromAddress('서울특별시 중구'), '중구');
  assert.equal(municipalityRegionCode('수원시'), 'GG_수원시');
});

test('municipalityFromAddress maps other metros when zone is given', () => {
  assert.equal(municipalityFromAddress('부산광역시 해운대구', 'BUSAN'), '해운대구');
  assert.equal(municipalityRegionCode('해운대구', 'BUSAN'), 'BUSAN_해운대구');
});

test('festivalDateYmd accepts YYYYMMDD, ISO, and dotted dates', () => {
  assert.equal(festivalDateYmd('20260919'), '2026-09-19');
  assert.equal(festivalDateYmd('2026-09-19 00:00:00.0'), '2026-09-19');
  assert.equal(festivalDateYmd('2026.09.19'), '2026-09-19');
  assert.equal(festivalDateYmd(new Date(Date.UTC(2026, 8, 19))), '2026-09-19');
});

test('listedMetroForRow maps open-data sources onto 17 metros', () => {
  assert.equal(listedMetroForRow({ source: 'seoul', title: '서울빛초롱축제' }), 'SEOUL');
  assert.equal(listedMetroForRow({ source: 'ggc', title: '수원화성문화제', location_name: '수원' }), 'GYEONGGI');
  assert.equal(listedMetroForRow({ source: 'ifac', location_name: '인천종합문화예술회관', municipality_name: '남동구' }), 'INCHEON');
  assert.equal(listedMetroForRow({ source: 'ifac', location_name: '서초구', municipality_name: '서울특별시' }), 'SEOUL');
  assert.equal(rowMatchesMetro({ source: 'ggc', title: '수원화성문화제' }, 'GYEONGGI'), true);
  assert.equal(rowMatchesMetro({ source: 'seoul', title: '서울빛초롱축제' }, 'GYEONGGI'), false);
});

test('mergeHomeFestivalRows keeps TourAPI as master over municipal duplicates', () => {
  const db = [{ title: '수원화성문화제', contentId: 'ggc-1', source: 'ggc', start_date: '2026-08-19', location_name: '수원' }];
  const tour = [
    { title: '수원화성문화제', contentId: 'tour-1', source: 'tour', start_date: '2026-08-19', location_name: '경기도 수원시' },
    { title: '가평 자라섬 재즈페스티벌', contentId: 'tour-2', source: 'tour', start_date: '2026-08-22', location_name: '가평' },
  ];
  const merged = mergeHomeFestivalRows(db, tour);
  assert.equal(merged[0].source, 'tour');
  assert.equal(merged.length, 2);
});

test('persist clips tel and municipality codes to schema limits', () => {
  assert.equal(clipFestivalTel(''), null);
  assert.equal(clipFestivalTel('031-228-3675'), '031-228-3675');
  const longTel = '경기도자미술관(이천) 031-645-0730 경기도자박물관(광주) 031-799-1500 경기생활도자미술관(여주) 031-887-8252';
  assert.equal(clipFestivalTel(longTel).length, 50);
  assert.ok(municipalityRegionCode('수원시').length <= 20);
});

test('festivalInsertPlaceholders builds parameterized multi-row values', () => {
  assert.equal(festivalInsertPlaceholders(1), '($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)');
  assert.match(festivalInsertPlaceholders(2), /\$15, \$16/);
  assert.match(festivalInsertPlaceholders(2), /\$28\)$/);
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
