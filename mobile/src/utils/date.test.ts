import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ddayLabel, festivalDateYmd, overlapsDay, toDate } from './date';

test('ended festivals get 종료 so home hide toggle can filter them', () => {
  const now = new Date('2026-08-28T00:00:00');
  assert.equal(ddayLabel('2026-08-01', '2026-08-10', now), '종료');
  assert.equal(ddayLabel('2026-08-20', '2026-08-30', now), '진행중');
  assert.equal(ddayLabel('2026-09-01', '2026-09-05', now), 'D-4');
  const list = [
    { title: '끝남', start_date: '2026-08-01', end_date: '2026-08-10' },
    { title: '진행', start_date: '2026-08-20', end_date: '2026-08-30' },
  ];
  const hidden = list.filter((item) => ddayLabel(item.start_date, item.end_date, now) !== '종료');
  assert.deepEqual(hidden.map((item) => item.title), ['진행']);
});

test('YYYYMMDD and Seoul timestamp dates still parse and stay on the list', () => {
  const now = new Date('2026-08-28T00:00:00');
  assert.equal(toDate('20260919') instanceof Date, true);
  assert.equal(festivalDateYmd('20260919'), '2026-09-19');
  assert.equal(ddayLabel('20260901', '20260905', now), 'D-4');
  assert.equal(ddayLabel('2026-12-24 00:00:00.0', '2026-12-24 00:00:00.0', now), 'D-118');
  assert.equal(ddayLabel('not-a-date', 'also-bad', now), '');
  assert.equal(overlapsDay('20260919', '20260920', '2026-09-19'), true);
  assert.equal(festivalDateYmd('20260919'), '2026-09-19');
});
