import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstNonEmptyFestivals, mergeFestivalSources } from './festivalFeed';
import { REGION_FESTIVAL_FALLBACKS } from '../constants/regionTour';
import type { HomeFestival } from '../types/home';

function fest(id: string, title = id): HomeFestival {
  return {
    id,
    contentId: id,
    title,
    latitude: 37,
    longitude: 127,
  };
}

test('empty listed festivals do not wipe TourAPI or home feed rows', () => {
  const listed: HomeFestival[] = [];
  const tour = [fest('tour-1', '수원화성문화제')];
  const feed = [fest('feed-1', '용인 한국민속촌 축제')];
  const merged = mergeFestivalSources(listed, tour, feed);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].title, '수원화성문화제');
  assert.equal(firstNonEmptyFestivals(listed, tour, feed)[0].id, 'tour-1');
});

test('listed festivals stay first but still merge missing TourAPI rows', () => {
  const listed = [fest('tour-1', '수원화성문화제')];
  const tour = [fest('tour-1', '수원화성문화제'), fest('tour-2', '가평 자라섬 재즈페스티벌')];
  const merged = mergeFestivalSources(listed, tour, []);
  assert.equal(merged.map((item) => item.id).join(','), 'tour-1,tour-2');
});

test('GYEONGGI fallbacks keep the home list populated', () => {
  assert.ok((REGION_FESTIVAL_FALLBACKS.GYEONGGI?.length ?? 0) >= 5);
  const merged = mergeFestivalSources([], [], [], REGION_FESTIVAL_FALLBACKS.GYEONGGI);
  assert.ok(merged.some((item) => item.title.includes('수원화성')));
});

test('17개 권역 축제 폴백이 모두 채워져 있다', () => {
  const zones = Object.keys(REGION_FESTIVAL_FALLBACKS);
  assert.ok(zones.length >= 17);
  for (const zone of zones) {
    assert.ok((REGION_FESTIVAL_FALLBACKS[zone]?.length ?? 0) >= 3, zone);
  }
  assert.ok(REGION_FESTIVAL_FALLBACKS.SEOUL.some((item) => item.title.includes('한강몽땅')));
});
