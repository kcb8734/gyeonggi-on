import assert from 'node:assert/strict';
import { test } from 'node:test';
import { festivalBelongsToMetro, metroFromPlace } from './metroGeo.js';

test('광주광역시와 경기 광주시를 구분한다', () => {
  assert.equal(metroFromPlace('광주광역시 서구 상무대로'), 'GWANGJU');
  assert.equal(metroFromPlace('경기도 광주시 경안동'), 'GYEONGGI');
});

test('제주 좌표·주소는 제주온에만 속한다', () => {
  const jeju = {
    title: '제주들불축제',
    location_name: '제주특별자치도 제주시',
    latitude: 33.459,
    longitude: 126.517,
  };
  assert.equal(festivalBelongsToMetro(jeju, 'JEJU'), true);
  assert.equal(festivalBelongsToMetro(jeju, 'GYEONGGI'), false);
});

test('경기 주소는 제주온에 섞이지 않는다', () => {
  const suwon = {
    title: '수원화성문화제',
    location_name: '경기도 수원시',
    latitude: 37.287,
    longitude: 127.013,
    metro: 'JEJU',
  };
  assert.equal(festivalBelongsToMetro(suwon, 'JEJU'), false);
  assert.equal(festivalBelongsToMetro(suwon, 'GYEONGGI'), true);
});
