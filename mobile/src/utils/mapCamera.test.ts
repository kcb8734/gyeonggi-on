import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryPinColor, regionFromPoints, validLatLng } from './mapCamera';

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
