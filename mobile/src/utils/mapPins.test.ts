import assert from 'node:assert/strict';
import { test } from 'node:test';
import { haversineKm, spreadOverlappingPins, withinKm } from './mapPins';

test('같은 좌표 핀을 서로 떨어뜨린다', () => {
  const stacked = [
    { id: 'a', latitude: 37.275, longitude: 127.15 },
    { id: 'b', latitude: 37.275, longitude: 127.15 },
    { id: 'c', latitude: 37.275, longitude: 127.15 },
  ];
  const spread = spreadOverlappingPins(stacked);
  const keys = new Set(spread.map((pin) => `${pin.latitude.toFixed(6)},${pin.longitude.toFixed(6)}`));
  assert.equal(keys.size, 3);
  assert.equal(spread[0].id, 'a');
  assert.ok(haversineKm(spread[0], spread[1]) > 0.15);
});

test('서로 다른 좌표는 그대로 둔다', () => {
  const pins = [
    { id: 'a', latitude: 37.287, longitude: 127.013 },
    { id: 'b', latitude: 37.259, longitude: 127.117 },
  ];
  const spread = spreadOverlappingPins(pins);
  assert.equal(spread[0].latitude, 37.287);
  assert.equal(spread[1].longitude, 127.117);
});

test('반경 안의 지점만 남긴다', () => {
  const center = { latitude: 37.275, longitude: 127.15 };
  assert.equal(withinKm({ latitude: 37.276, longitude: 127.151 }, center, 8), true);
  assert.equal(withinKm({ latitude: 37.823, longitude: 127.513 }, center, 8), false);
  assert.ok(haversineKm(center, { latitude: 37.287, longitude: 127.013 }) > 5);
});
