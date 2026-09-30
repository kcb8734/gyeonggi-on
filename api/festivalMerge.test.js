import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assembleCollectedFestivals, mergeFestivalSources } from './festivalMerge.js';

test('문화재단이 있어도 관광공사 폴백을 버리지 않는다', () => {
  const assembled = assembleCollectedFestivals({
    metroKey: 'GYEONGGI',
    tourResult: {
      source: 'fallback',
      festivals: [{ title: '파주 장단콩축제', contentId: 'paju-jangdan' }],
    },
    cultureFestivals: [{ title: '국립극장 쏙쏙들이페스티벌', contentId: '3488421', source: 'ggc' }],
    kfesFestivals: [{ title: '수원화성문화제', contentId: '2756253', source: 'visitkorea' }],
    persisted: [],
    mapTour: (item) => ({ ...item, source: item.source || 'tour' }),
  });
  assert.match(assembled.source, /culture/);
  assert.match(assembled.source, /fallback|tour/);
  assert.match(assembled.source, /visitkorea/);
  assert.equal(assembled.festivals.length, 3);
  assert.ok(assembled.festivals.some((row) => row.title.includes('장단콩')));
  assert.ok(assembled.festivals.some((row) => row.source === 'ggc'));
});

test('같은 제목은 한 번만 남긴다', () => {
  const rows = mergeFestivalSources(
    [{ title: '수원화성문화제', source: 'ggc' }],
    [{ title: '수원화성문화제', source: 'tour' }],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source, 'ggc');
});
