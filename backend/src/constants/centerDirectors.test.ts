import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyBusinessCard,
  applyCenterDirector,
  listApplications,
  listCenterLocalities,
  localityWebSlug,
  resetCenterDirectorState,
  reviewApplication,
  SELECTED_DIRECTORS,
  summarizeCenterRegions,
} from './centerDirectors';

test('17 regions summarize selected Gyeonggi directors', () => {
  resetCenterDirectorState();
  const regions = summarizeCenterRegions();
  assert.equal(regions.length, 17);
  const gyeonggi = regions.find((row) => row.id === 'GYEONGGI');
  assert.equal(gyeonggi?.total, 31);
  assert.equal(gyeonggi?.selected, 3);
  assert.match(gyeonggi?.label ?? '', /경기온/);
  const total = regions.reduce((sum, row) => sum + row.total, 0);
  assert.ok(total >= 228);
});

test('selected locality opens a director profile with card fields', () => {
  resetCenterDirectorState();
  const suwon = listCenterLocalities('GYEONGGI').find((row) => row.label === '수원시');
  assert.equal(suwon?.status, 'selected');
  assert.equal(suwon?.director?.name, SELECTED_DIRECTORS['GYEONGGI:수원시'].name);
  assert.ok(suwon?.director?.address);
  assert.equal(suwon?.director?.website, 'kdanji.com/suwon');
  const recruiting = listCenterLocalities('GYEONGGI').find((row) => row.status === 'recruiting');
  assert.ok(recruiting);
  assert.equal(recruiting?.applicantCount, 0);
});

test('apply increments applicant count and keeps recruiting until admin review', () => {
  resetCenterDirectorState();
  const target = listCenterLocalities('GYEONGGI').find((row) => row.status === 'recruiting');
  assert.ok(target);
  const result = applyCenterDirector({
    localityKey: target!.id,
    name: '김지원',
    age: '36',
    phone: '010-1234-5678',
    email: 'apply@kdanji.com',
    address: '경기도 용인시 처인구 중앙로 1',
    career: '지역 축제 운영 3년',
    intro: '상가와 축제를 잇겠습니다.',
  });
  assert.equal(result.ok, true);
  const after = listCenterLocalities('GYEONGGI').find((row) => row.id === target!.id);
  assert.equal(after?.status, 'recruiting');
  assert.equal(after?.applicantCount, 1);
  assert.equal(listApplications().length, 1);
});

test('admin can mark reviewing, selected, and apply business card fields', () => {
  resetCenterDirectorState();
  const target = listCenterLocalities('GANGWON').find((row) => row.label === '춘천시');
  assert.ok(target);
  const applied = applyCenterDirector({
    localityKey: target!.id,
    name: '홍길동',
    age: '42',
    phone: '010-1234-5678',
    email: 'chuncheon@kdanji.com',
    address: '강원특별자치도 춘천시 중앙로 123, 3층',
    career: '춘천 축제 기획',
    intro: '마임축제와 중앙시장을 잇겠습니다.',
  });
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  const reviewing = reviewApplication(applied.data.id, 'reviewing');
  assert.equal(reviewing.ok, true);
  assert.equal(listCenterLocalities('GANGWON').find((row) => row.id === target!.id)?.status, 'reviewing');
  const card = applyBusinessCard(applied.data.id);
  assert.equal(card.ok, true);
  const selected = listCenterLocalities('GANGWON').find((row) => row.id === target!.id);
  assert.equal(selected?.status, 'selected');
  assert.equal(selected?.director?.name, '홍길동');
  assert.equal(selected?.director?.email, 'chuncheon@kdanji.com');
  assert.equal(selected?.director?.address, '강원특별자치도 춘천시 중앙로 123, 3층');
  assert.equal(selected?.director?.website, 'kdanji.com/chuncheon');
  assert.equal(localityWebSlug('춘천시'), 'chuncheon');
  const reviewingAgain = reviewApplication(applied.data.id, 'reviewing');
  assert.equal(reviewingAgain.ok, true);
  const afterCard = listCenterLocalities('GANGWON').find((row) => row.id === target!.id);
  assert.equal(afterCard?.status, 'reviewing');
  assert.equal(afterCard?.director, undefined);
  const reopened = reviewApplication(applied.data.id, 'submitted');
  assert.equal(reopened.ok, true);
  const recruitingAgain = listCenterLocalities('GANGWON').find((row) => row.id === target!.id);
  assert.equal(recruitingAgain?.status, 'recruiting');
  assert.equal(recruitingAgain?.director, undefined);
  const second = applyCenterDirector({
    localityKey: target!.id,
    name: '김결격',
    age: '40',
    phone: '010-2222-3333',
    email: 'retry@kdanji.com',
    address: '강원특별자치도 춘천시 중앙로 1',
    career: '재지원',
    intro: '다시 지원합니다.',
  });
  assert.equal(second.ok, true);
});
