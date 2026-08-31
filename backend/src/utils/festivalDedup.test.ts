import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeFestivalMasters, normalizeFestivalTitle } from './festivalDedup';

test('TourAPI is master and unique municipal festivals remain', () => {
  const merged = mergeFestivalMasters(
    [{ title: '제60회 수원화성문화제', source: 'ggc', start_date: '2026-08-20', location_name: '수원' }],
    [{ title: '수원화성문화제', source: 'tour', start_date: '2026-08-19', location_name: '경기도 수원시' }],
    [{ title: '마포 낭독극', source: 'seoul', start_date: '2026-11-29', location_name: '마포' }],
  );
  assert.equal(merged.find((row) => normalizeFestivalTitle(String(row.title)).includes('수원화성'))?.source, 'tour');
  assert.ok(merged.some((row) => String(row.title).includes('마포')));
  assert.equal(merged.filter((row) => String(row.title).includes('수원화성')).length, 1);
});
