import test from 'node:test';
import assert from 'node:assert/strict';
import { boundToLocality, categoryPinColor, pinsInSelectedRegion, regionFromPoints, validLatLng } from './mapCamera';

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
