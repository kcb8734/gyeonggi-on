import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  daysWithFestivals,
  kfesDate,
  kfesImageUrl,
  metroFromKfes,
  toKfesFestival,
  crawlVisitkoreaCalendar,
} from './visitkoreaCalendar.js';

const sampleItem = {
  fstvlCntntsId: '7bb92f39-bc94-44fc-94fb-13c974770bdf',
  cntntsNm: '수원화성문화제',
  cmsCntntsId: '2756253',
  areaNm: '경기도 수원시',
  adres: '경기도 수원시 팔달구 정조로 825',
  dtadr: '수원화성 행궁광장',
  fstvlBgngDe: '2026.09.01',
  fstvlEndDe: '2026.09.30',
  regnDivCd: '41',
  dispFstvlCntntsImgRout: '/data/kfes/contents/db/7bb92f39-bc94-44fc-94fb-13c974770bdf_11.jpg',
  xcrdVal: 127.013,
  ycrdVal: 37.287,
};

test('kfes helpers parse calendar item fields', () => {
  assert.equal(kfesDate('2026.09.07'), '2026-09-07');
  assert.match(kfesImageUrl(sampleItem), /300_7bb92f39/);
  assert.equal(metroFromKfes(sampleItem), 'GYEONGGI');
  const mapped = toKfesFestival(sampleItem);
  assert.equal(mapped.contentId, '2756253');
  assert.equal(mapped.title, '수원화성문화제');
  assert.equal(mapped.eventStartDate, '2026-09-01');
  assert.equal(mapped.location_name, '수원화성 행궁광장');
  assert.equal(mapped.source, 'visitkorea');
});

test('daysWithFestivals skips empty calendar cells', () => {
  const days = daysWithFestivals({
    data: [
      [{ day: 0, count: -1 }, { day: 1, count: 0 }, { day: 8, count: 6 }],
      [{ day: 9, count: 7 }],
    ],
  });
  assert.deepEqual(days, [8, 9]);
});

test('crawlVisitkoreaCalendar walks 일자별 list endpoints', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    if (url.includes('festivalCalendarUp.do')) {
      return { ok: true, json: async () => ({ data: [[{ day: 8, count: 1 }]] }) };
    }
    if (url.includes('festivalCalendarList.do')) {
      return { ok: true, json: async () => ({ dataList: { total: 1, items: [sampleItem] } }) };
    }
    throw new Error('unexpected ' + url);
  };
  const result = await crawlVisitkoreaCalendar({ year: 2026, months: [9], metros: ['GYEONGGI'] }, fetchImpl);
  assert.ok(urls.some((url) => url.includes('festivalCalendarUp.do?year=2026&month=9')));
  assert.ok(urls.some((url) => url.includes('festivalCalendarList.do?year=2026&month=9&day=8')));
  assert.equal(result.fetched, 1);
  assert.equal(result.festivals[0].title, '수원화성문화제');
  assert.equal(result.source, 'visitkorea');
});
