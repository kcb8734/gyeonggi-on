import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findLocalityByWebSlug, localityWebSlug, listCenterLocalities, summarizeCenterRegions } from '../constants/centerDirectors';
import { CARD_MM, CARD_PRINT_CM, buildCenterCardFaceDocument, buildCenterCardHtml, buildCenterCardModel, setJpegDpi } from './centerCardDocument';

test('chuncheon slug and print card size', () => {
  assert.equal(localityWebSlug('춘천시'), 'chuncheon');
  assert.equal(findLocalityByWebSlug('chuncheon')?.label, '춘천시');
  assert.equal(CARD_MM.width, 92);
  assert.equal(CARD_MM.height, 52);
  assert.equal(CARD_MM.photoW, 20);
  assert.equal(CARD_MM.photoH, 25);
});

test('selected suwon card html matches print spec', () => {
  const suwon = listCenterLocalities('GYEONGGI').find((row) => row.label === '수원시');
  assert.ok(suwon);
  const model = buildCenterCardModel(suwon!);
  assert.ok(model);
  const html = buildCenterCardHtml(model!);
  assert.match(html, /size: 92mm 52mm/);
  assert.match(html, /class="kv"/);
  assert.match(html, /class="brand-block"/);
  assert.match(html, /class="stage"/);
  assert.match(html, /white-space: nowrap/);
  assert.match(html, /grid-template-columns: 1fr 1fr/);
  assert.match(html, /kdanji.com\/suwon/);
  assert.match(html, /온앤온\+/);
  assert.match(html, /#585656/);
  assert.match(html, /#585655/);
  assert.match(html, /data:image\/png/);
  assert.match(html, /viewport/);
  assert.equal(CARD_MM.pad, 6.4);
  assert.equal(CARD_MM.photoW, 20);
  assert.equal(CARD_MM.photoH, 25);
  assert.equal(CARD_MM.brandAboveRule, 2.15);
  assert.equal(CARD_MM.contactBelowRule, 0.85);
  assert.equal(CARD_MM.contactFont, 2.55);
  assert.equal(CARD_MM.ruleFromBottom, 6.15);
  assert.equal(CARD_MM.brandLineGap, 0.12);
});

test('jpeg dpi stamp keeps 9.2cm x 5.2cm print size', () => {
  assert.equal(CARD_PRINT_CM.width, 9.2);
  assert.equal(CARD_PRINT_CM.height, 5.2);
  const bytes = Uint8Array.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10,
    0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x02, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ]);
  const stamped = setJpegDpi(bytes, 400);
  assert.equal(stamped[13], 1);
  assert.equal((stamped[14] << 8) + stamped[15], 400);
  assert.equal((stamped[16] << 8) + stamped[17], 400);
});

test('17 regions still summarize', () => {
  assert.equal(summarizeCenterRegions().length, 17);
});

test('front face document uses flex layout and nowrap contact values', () => {
  const suwon = listCenterLocalities('GYEONGGI').find((row) => row.label === '수원시');
  const model = buildCenterCardModel(suwon!);
  const html = buildCenterCardFaceDocument(model!, 'front', 400);
  assert.match(html, /data-card-face="front"/);
  assert.match(html, /display: flex/);
  assert.match(html, /display: grid/);
  assert.match(html, /white-space: nowrap/);
  assert.match(html, /class="brand-block"/);
  assert.match(html, /class="kv addr"/);
  assert.match(html, />A\.</);
  assert.doesNotMatch(html, />W\.</);
  assert.match(html, /position: absolute/);
  assert.doesNotMatch(html, /max-width: 640px/);
});

test('back face keeps website QR while print size stays 92x52mm', () => {
  const suwon = listCenterLocalities('GYEONGGI').find((row) => row.label === '수원시');
  const model = buildCenterCardModel(suwon!);
  const html = buildCenterCardFaceDocument(model!, 'back', 400);
  assert.match(html, /data-card-face="back"/);
  assert.match(html, /kdanji.com\/suwon/);
  assert.equal(CARD_MM.width, 92);
  assert.equal(CARD_MM.height, 52);
});
