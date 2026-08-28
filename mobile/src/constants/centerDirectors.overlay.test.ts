import assert from 'node:assert/strict';
import { test } from 'node:test';
import { overlayLocalities, overlayRegions, type CenterLocalityRow, type CenterRegionSummary } from './centerDirectors';

const suwon: CenterLocalityRow = {
  id: 'GYEONGGI:수원시',
  localityId: '수원시',
  label: '수원시',
  region: 'GYEONGGI',
  regionLabel: '경기온',
  status: 'selected',
  applicantCount: 1,
  director: { name: '박서연', title: '경기온 수원 센터장', phone: '031-120', email: 'suwon@kdanji.com', intro: '' },
};

test('admin 지원하기 overlay clears selected card and shows recruiting', () => {
  const rows = overlayLocalities([suwon], {
    localityStatus: { 'GYEONGGI:수원시': 'recruiting' },
    directors: {},
    applications: [],
  });
  assert.equal(rows[0].status, 'recruiting');
  assert.equal(rows[0].director, undefined);
});

test('admin 지원완료 overlay shows reviewing without card', () => {
  const rows = overlayLocalities([suwon], {
    localityStatus: { 'GYEONGGI:수원시': 'reviewing' },
    reviewingKeys: ['GYEONGGI:수원시'],
    directors: {},
  });
  assert.equal(rows[0].status, 'reviewing');
  assert.equal(rows[0].director, undefined);
});

test('region summary follows overlay instead of keeping selected max', () => {
  const api: CenterRegionSummary[] = [{
    id: 'GYEONGGI',
    label: '경기온',
    total: 31,
    selected: 3,
    reviewing: 2,
    recruiting: 26,
    covers: '31',
  }];
  const next = overlayRegions(api, {
    localityStatus: { 'GYEONGGI:수원시': 'recruiting' },
  });
  const gyeonggi = next.find((row) => row.id === 'GYEONGGI');
  assert.ok(gyeonggi);
  assert.equal(gyeonggi!.selected, 2);
  assert.ok((gyeonggi!.recruiting ?? 0) >= 26);
});
