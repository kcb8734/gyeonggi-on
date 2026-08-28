import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyLocalBusinessCard,
  centerOverlay,
  rememberApplication,
  reviewLocalApplication,
} from './centerApplyStore';

test('card apply then 지원하기 clears director overlay', () => {
  const row = rememberApplication({
    localityKey: 'GANGWON:춘천시',
    name: '홍길동',
    age: '42',
    phone: '010-1234-5678',
    email: 'chuncheon@kdanji.com',
    address: '춘천시',
    career: '축제',
    intro: '소개',
  }, { localityLabel: '춘천시', region: 'GANGWON', regionLabel: '강원온' });
  assert.ok(row);
  applyLocalBusinessCard(row!.id);
  let overlay = centerOverlay();
  assert.equal(overlay.localityStatus?.['GANGWON:춘천시'], 'selected');
  assert.equal(overlay.directors?.['GANGWON:춘천시']?.name, '홍길동');
  reviewLocalApplication(row!.id, 'reviewing');
  overlay = centerOverlay();
  assert.equal(overlay.localityStatus?.['GANGWON:춘천시'], 'reviewing');
  assert.equal(overlay.directors?.['GANGWON:춘천시'], undefined);
  reviewLocalApplication(row!.id, 'submitted');
  overlay = centerOverlay();
  assert.equal(overlay.localityStatus?.['GANGWON:춘천시'], 'recruiting');
  assert.equal(overlay.directors?.['GANGWON:춘천시'], undefined);
  assert.equal(overlay.applications?.find((item) => item.id === row!.id)?.cardApplied, false);
  assert.equal(overlay.applications?.find((item) => item.id === row!.id)?.reviewStatus, 'submitted');
});
