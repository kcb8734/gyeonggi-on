import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listCenterLocalities, overlayLocalities, overlayRegions, type CenterLocalityRow, type CenterRegionSummary } from './centerDirectors';

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

test('API 종로 센터장에 사진이 없어도 목업 사진을 유지한다', () => {
  const seed = listCenterLocalities('SEOUL').find((row) => row.label === '종로구');
  assert.ok(seed?.director);
  const rows = overlayLocalities([{
    ...seed!,
    director: { ...seed!.director!, photoUrl: undefined },
  }], {
    directors: {
      'SEOUL:종로구': { ...seed!.director!, photoUrl: undefined },
    },
  });
  assert.match(String(rows[0].director?.photoUrl || ''), /data:image\/jpeg|jongno-director/);
});
