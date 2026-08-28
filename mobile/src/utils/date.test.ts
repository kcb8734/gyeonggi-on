import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ddayLabel } from './date';

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
