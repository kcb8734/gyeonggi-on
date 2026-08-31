import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isSimilarFestival,
  mergeFestivalMasters,
  normalizeFestivalTitle,
  sourceRank,
} from './festivalDedup.js';

test('TourAPI wins over Seoul/Gyeonggi/Incheon duplicates and unique municipal rows stay', () => {
  const tour = [
    { title: '수원화성문화제', start_date: '2026-08-19', location_name: '경기도 수원시', source: 'tour', contentId: 'tour-1' },
    { title: '서울빛초롱축제', start_date: '2026-12-12', location_name: '서울특별시 중구', source: 'tour', contentId: 'tour-2' },
  ];
  const seoul = [
    { title: '서울빛초롱축제', start_date: '2026-12-12', location_name: '청계천', source: 'seoul', contentId: 'sel-1' },
    { title: '마포 낭독극', start_date: '2026-11-29', location_name: '마포아트센터', source: 'seoul', contentId: 'sel-2' },
  ];
  const ggc = [
    { title: '제60회 수원화성문화제', start_date: '2026-08-20', location_name: '수원시 화성행궁', source: 'ggc', contentId: 'ggc-1' },
    { title: '오페라박물관 야외음악회', start_date: '2026-10-01', location_name: '과천시', source: 'ggc', contentId: 'ggc-2' },
  ];
  const ifac = [
    { title: '강화고인돌문화축제', start_date: '2026-10-10', location_name: '인천광역시 강화군', source: 'ifac', contentId: 'ifc-1' },
  ];
  const merged = mergeFestivalMasters(ggc, seoul, ifac, tour);
  assert.equal(merged.find((row) => normalizeFestivalTitle(row.title).includes('수원화성')).source, 'tour');
  assert.equal(merged.find((row) => row.title.includes('빛초롱')).source, 'tour');
  assert.ok(merged.some((row) => row.title.includes('마포 낭독극')));
  assert.ok(merged.some((row) => row.title.includes('오페라박물관')));
  assert.ok(merged.some((row) => row.title.includes('고인돌')));
  assert.equal(merged.filter((row) => row.title.includes('수원화성')).length, 1);
  assert.ok(merged.find((row) => row.title.includes('수원화성')).alsoFrom.includes('ggc'));
});

test('sample rows are dropped and dissimilar titles are kept', () => {
  const merged = mergeFestivalMasters(
    [{ title: '샘플 콘서트', source: 'sample', contentId: 'fb-1' }],
    [{ title: '수원화성문화제', source: 'ggc', contentId: 'ggc-1', start_date: '2026-08-19' }],
    [{ title: '이천쌀문화축제', source: 'tour', contentId: 'tour-9', start_date: '2026-10-22' }],
  );
  assert.equal(merged.some((row) => row.source === 'sample'), false);
  assert.equal(merged.length, 2);
  assert.equal(sourceRank('tour') < sourceRank('seoul'), true);
  assert.equal(isSimilarFestival(
    { title: '수원화성문화제', start_date: '2026-08-19', location_name: '수원' },
    { title: '이천쌀문화축제', start_date: '2026-10-22', location_name: '이천' },
  ), false);
});
