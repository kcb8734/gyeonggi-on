import assert from 'node:assert/strict';
import { test } from 'node:test';
import { firstNonEmptyFestivals, festivalBelongsToMetro, festivalsForMetro, mergeFestivalSources, matchesFestivalCategory } from './festivalFeed';
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

test('excel listed festivals stay searchable as 계절축제', () => {
  const listed = [{
    id: 'excel-1',
    contentId: 'excel-1',
    title: '수원화성문화제',
    latitude: 37,
    longitude: 127,
    category: '문화/예술',
    source: 'excel',
  }];
  assert.equal(matchesFestivalCategory(listed[0], '계절축제'), true);
  const merged = mergeFestivalSources(listed, [fest('tour-2', '가평 자라섬 재즈페스티벌')]);
  assert.equal(merged[0].source, 'excel');
});

test('제주온 목록에 경기온 축제가 섞이지 않는다', () => {
  const mixed = [
    { id: 'gg', title: '수원화성문화제', location_name: '경기도 수원시', latitude: 37.287, longitude: 127.013, metro: 'GYEONGGI' },
    { id: 'jj', title: '제주들불축제', location_name: '제주특별자치도 제주시', latitude: 33.459, longitude: 126.517, metro: 'JEJU' },
  ];
  const jeju = festivalsForMetro(mixed, 'JEJU');
  assert.equal(jeju.length, 1);
  assert.equal(jeju[0].title, '제주들불축제');
  const gyeonggi = festivalsForMetro(mixed, 'GYEONGGI');
  assert.equal(gyeonggi.length, 1);
  assert.equal(gyeonggi[0].title, '수원화성문화제');
});

test('태그만 제주온으로 덮어쓴 경기 축제도 걸러낸다', () => {
  const leaked = {
    id: 'leak',
    title: '수원화성문화제',
    location_name: '경기도 수원시 팔달구',
    latitude: 37.287,
    longitude: 127.013,
    metro: 'JEJU',
    regionalZone: 'JEJU',
  };
  assert.equal(festivalBelongsToMetro(leaked, 'JEJU'), false);
  assert.equal(festivalBelongsToMetro(leaked, 'GYEONGGI'), true);
});

test('인천온 좌표 박스에 고양·양주가 섞이지 않는다', () => {
  assert.equal(festivalBelongsToMetro({
    id: 'goyang',
    title: '고양미술축제',
    latitude: 37.6584,
    longitude: 126.8320,
  }, 'INCHEON'), false);
  assert.equal(festivalBelongsToMetro({
    id: 'songdo',
    title: '인천펜타포트',
    latitude: 37.389,
    longitude: 126.643,
  }, 'INCHEON'), true);
});
