import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boundToLocality,
  categoryPinColor,
  coordsInMetroBBox,
  eligibleHomeMapPins,
  isMetroCenterCoord,
  koreaLandCoords,
  pinsInSelectedRegion,
  regionFromPoints,
  validLatLng,
} from './mapCamera';

test('강릉 좌표만 유효로 본다', () => {
  assert.equal(validLatLng(37.7792, 128.878), true);
  assert.equal(validLatLng(0, 0), false);
  assert.equal(validLatLng(undefined, 127), false);
});

test('카테고리별 마커 색', () => {
  assert.equal(categoryPinColor('역사체험'), 'orange');
  assert.equal(categoryPinColor('전통시장 먹거리'), 'green');
  assert.equal(categoryPinColor('메인 축제'), 'blue');
  assert.equal(categoryPinColor('캠핑장/숙박'), 'violet');
});

test('코스 지점으로 강릉 bounds를 만든다', () => {
  const region = regionFromPoints([
    { latitude: 37.7792, longitude: 128.878 },
    { latitude: 37.754, longitude: 128.898 },
    { latitude: 37.7519, longitude: 128.8761 },
    { latitude: 37.804, longitude: 128.907 },
  ]);
  assert.ok(region);
  assert.ok(region.latitude > 37.7 && region.latitude < 37.85);
  assert.ok(region.longitude > 128.8 && region.longitude < 129.0);
  assert.ok(region.latitudeDelta < 0.2);
});

test('타 지역 좌표는 바운더리에서 제외한다', () => {
  const points = boundToLocality([
    { latitude: 37.3215, longitude: 126.8308 },
    { latitude: 37.2997, longitude: 126.8370 },
    { latitude: 35.0966, longitude: 129.0306 },
  ], 40, { latitude: 37.3215, longitude: 126.8308 });
  assert.equal(points.some((point) => point.longitude > 128), false);
  assert.ok(points.length >= 2);
});

test('선택 권역 밖의 핀은 빈 배열로 남긴다', () => {
  const jeju = { latitude: 33.4996, longitude: 126.5312 };
  const kept = pinsInSelectedRegion([
    { latitude: 37.287, longitude: 127.013 },
    { latitude: 33.459, longitude: 126.517 },
  ], jeju, 90);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].latitude, 33.459);
});

test('인천 박스에 고양·서울·포천 좌표는 넣지 않는다', () => {
  assert.equal(coordsInMetroBBox(37.3890, 126.6430, 'INCHEON'), true);
  assert.equal(coordsInMetroBBox(37.6584, 126.8320, 'INCHEON'), false);
  assert.equal(coordsInMetroBBox(37.5665, 126.9780, 'INCHEON'), false);
  assert.equal(coordsInMetroBBox(37.8949, 127.2009, 'INCHEON'), false);
});

test('제주 바다·한반도 좌표는 제주 미니맵에서 뺀다', () => {
  assert.equal(koreaLandCoords(33.45, 126.52), true);
  assert.equal(coordsInMetroBBox(33.65, 126.53, 'JEJU'), false);
  assert.equal(coordsInMetroBBox(37.287, 127.013, 'JEJU'), false);
  assert.equal(coordsInMetroBBox(33.253, 126.560, 'JEJU'), true);
});

test('권역 기본 좌표와 바다 핀은 홈 지도에서 제외한다', () => {
  const origin = { latitude: 36.48, longitude: 127.289 };
  const pins = eligibleHomeMapPins([
    { latitude: 36.48, longitude: 127.289 },
    { latitude: 36.0, longitude: 125.0 },
    { latitude: 36.504, longitude: 127.265 },
  ], 'SEJONG', origin);
  assert.equal(pins.length, 1);
  assert.equal(pins[0].latitude, 36.504);
  assert.equal(isMetroCenterCoord(36.48, 127.289, origin), true);
});
