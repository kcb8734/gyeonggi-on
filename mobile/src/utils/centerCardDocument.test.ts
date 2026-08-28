import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findLocalityByWebSlug, localityWebSlug, listCenterLocalities, summarizeCenterRegions } from '../constants/centerDirectors';
import { CARD_MM, buildCenterCardFaceDocument, buildCenterCardHtml, buildCenterCardModel } from './centerCardDocument';

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
  assert.match(html, /data:image\/png/);
  assert.match(html, /viewport/);
  assert.equal(CARD_MM.pad, 6.4);
  assert.equal(CARD_MM.photoW, 20);
  assert.equal(CARD_MM.photoH, 25);
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
  assert.doesNotMatch(html, /max-width: 640px/);
});
