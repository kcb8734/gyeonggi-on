import assert from 'node:assert/strict';
import { test } from 'node:test';
import { festivalImageFor } from './regionMedia';

test('피드용 축제 이미지는 http(s) URL이다', () => {
  const suwon = festivalImageFor('수원 국가유산야행', '수원', 'GYEONGGI');
  const market = festivalImageFor('영동시장', '수원', 'GYEONGGI');
  const jazz = festivalImageFor('자라섬', '가평', 'GYEONGGI');
  assert.match(suwon, /^https:\/\//);
  assert.match(market, /^https:\/\//);
  assert.match(jazz, /^https:\/\//);
  assert.doesNotMatch(suwon, /^asset:/);
});
