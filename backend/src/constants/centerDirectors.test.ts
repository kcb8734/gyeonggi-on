import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyCenterDirector,
  listCenterLocalities,
  SELECTED_DIRECTORS,
  summarizeCenterRegions,
} from './centerDirectors';

test('17 regions summarize selected Gyeonggi directors', () => {
  const regions = summarizeCenterRegions();
  assert.equal(regions.length, 17);
  const gyeonggi = regions.find((row) => row.id === 'GYEONGGI');
  assert.equal(gyeonggi?.total, 31);
  assert.equal(gyeonggi?.selected, 3);
  assert.match(gyeonggi?.label ?? '', /경기온/);
  const total = regions.reduce((sum, row) => sum + row.total, 0);
  assert.ok(total >= 228);
});

test('selected locality opens a director profile', () => {
  const suwon = listCenterLocalities('GYEONGGI').find((row) => row.label === '수원시');
  assert.equal(suwon?.status, 'selected');
  assert.equal(suwon?.director?.name, SELECTED_DIRECTORS['GYEONGGI:수원시'].name);
  const recruiting = listCenterLocalities('GYEONGGI').find((row) => row.status === 'recruiting');
  assert.ok(recruiting);
});

test('apply moves a recruiting city to reviewing', () => {
  const target = listCenterLocalities('GYEONGGI').find((row) => row.status === 'recruiting');
  assert.ok(target);
  const result = applyCenterDirector({
    localityKey: target!.id,
    name: '김지원',
    phone: '010-1234-5678',
    career: '지역 축제 운영 3년',
    intro: '상가와 축제를 잇겠습니다.',
  });
  assert.equal(result.ok, true);
  const after = listCenterLocalities('GYEONGGI').find((row) => row.id === target!.id);
  assert.equal(after?.status, 'reviewing');
});
