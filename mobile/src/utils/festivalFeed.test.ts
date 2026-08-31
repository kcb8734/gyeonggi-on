import assert from 'node:assert/strict';
import { test } from 'node:test';
import { festivalListHeroUrl, firstNonEmptyFestivals, mergeFestivalSources, preferPersistedFestivalList, tourDetailParams } from './festivalFeed';
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

test('TourAPI master hides municipal duplicates but keeps unique local events', () => {
  const listed = [
    { ...fest('ggc-1', '제60회 수원화성문화제'), source: 'ggc', start_date: '2026-08-20', location_name: '수원' },
    { ...fest('ggc-2', '오페라박물관 야외음악회'), source: 'ggc', start_date: '2026-10-01', location_name: '과천' },
  ];
  const tour = [
    { ...fest('tour-1', '수원화성문화제'), source: 'tour', start_date: '2026-08-19', location_name: '경기도 수원시' },
  ];
  const merged = preferPersistedFestivalList(listed, tour, []);
  assert.equal(merged.find((row) => row.title.includes('수원화성'))?.source, 'tour');
  assert.ok(merged.some((row) => row.title.includes('오페라박물관')));
  assert.equal(merged.filter((row) => row.title.includes('수원화성')).length, 1);
});

test('GYEONGGI fallbacks keep the home list populated', () => {
  assert.ok((REGION_FESTIVAL_FALLBACKS.GYEONGGI?.length ?? 0) >= 5);
  const merged = mergeFestivalSources([], [], [], REGION_FESTIVAL_FALLBACKS.GYEONGGI);
  assert.ok(merged.some((item) => item.title.includes('수원화성')));
});

test('preferPersistedFestivalList does not bury DB rows under dummy fallbacks', () => {
  const listed = [fest('ggc-1', '오페라박물관 야외음악회 사랑의 묘약')];
  const merged = preferPersistedFestivalList(listed, [], [], REGION_FESTIVAL_FALLBACKS.GYEONGGI);
  assert.equal(merged[0].title, '오페라박물관 야외음악회 사랑의 묘약');
  assert.equal(merged.some((item) => item.title.includes('수원화성')), false);
  const empty = preferPersistedFestivalList([], [], [], REGION_FESTIVAL_FALLBACKS.GYEONGGI ?? []);
  assert.ok(empty.length > 0);
});

test('17개 권역 축제 폴백이 모두 채워져 있다', () => {
  const zones = Object.keys(REGION_FESTIVAL_FALLBACKS);
  assert.ok(zones.length >= 17);
  for (const zone of zones) {
    assert.ok((REGION_FESTIVAL_FALLBACKS[zone]?.length ?? 0) >= 3, zone);
  }
  assert.ok(REGION_FESTIVAL_FALLBACKS.SEOUL.some((item) => item.title.includes('한강몽땅')));
});

test('양평 세미원 상세는 리스트와 같은 연꽃 이미지를 쓴다', () => {
  const listed = festivalListHeroUrl({
    title: '양평 세미원 연꽃문화제',
    location_name: '경기도 양평군 양서면 양수로 93',
    image_url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
    metro: 'GYEONGGI',
  });
  const fromRecent = festivalListHeroUrl(null, {
    title: '양평 세미원 연꽃문화제',
    address: '경기도 양평군 양서면 양수로 93',
    metro: 'GYEONGGI',
  });
  assert.equal(listed, fromRecent);
  assert.match(listed, /1469474968028-56623f02e42e/);
  const params = tourDetailParams({
    id: 'gg-9',
    contentId: 'yangpyeong-lotus',
    title: '양평 세미원 연꽃문화제',
    location_name: '경기도 양평군 양서면 양수로 93',
    latitude: 37.54,
    longitude: 127.37,
    image_url: listed,
    metro: 'GYEONGGI',
  });
  assert.equal(params.imageUrl, listed);
});
