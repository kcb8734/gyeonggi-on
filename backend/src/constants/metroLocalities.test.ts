import assert from 'node:assert/strict';
import test from 'node:test';
import { matchingMatrixRows, METRO_LOCALITIES, REGION_META } from './metroLocalities';
import { ALL_TOUR_AREA_CODES, regionalZoneFor, REGION_PRESETS } from './regionTour';

test('matching matrix covers all 17 metro regions with unique ids', () => {
  const rows = matchingMatrixRows();
  const regions = [...new Set(rows.map((row) => row.region))];
  assert.equal(Object.keys(METRO_LOCALITIES).length, 17);
  assert.equal(Object.keys(REGION_META).length, 17);
  assert.deepEqual(regions, Object.keys(METRO_LOCALITIES));
  assert.equal(rows.length, Object.values(METRO_LOCALITIES).reduce((sum, locs) => sum + locs.length, 0));
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
  assert.ok(rows.every((row) => row.regionalZone === row.region));
  assert.equal(rows.filter((row) => row.region === 'GYEONGGI').length, 31);
  assert.equal(rows.filter((row) => row.region === 'SEOUL').length, 25);
  assert.equal(rows.filter((row) => row.region === 'BUSAN').length, 16);
  assert.equal(rows.filter((row) => row.region === 'DAEGU').length, 9);
  assert.equal(rows.filter((row) => row.region === 'INCHEON').length, 10);
  assert.equal(rows.filter((row) => row.region === 'GWANGJU').length, 5);
  assert.equal(rows.filter((row) => row.region === 'DAEJEON').length, 5);
  assert.equal(rows.filter((row) => row.region === 'ULSAN').length, 5);
  assert.equal(rows.filter((row) => row.region === 'SEJONG').length, 1);
  assert.equal(rows.filter((row) => row.region === 'GANGWON').length, 18);
  assert.equal(rows.filter((row) => row.region === 'CHUNGBUK').length, 11);
  assert.equal(rows.filter((row) => row.region === 'CHUNGNAM').length, 15);
  assert.equal(rows.filter((row) => row.region === 'JEONBUK').length, 14);
  assert.equal(rows.filter((row) => row.region === 'JEONNAM').length, 22);
  assert.equal(rows.filter((row) => row.region === 'GYEONGBUK').length, 22);
  assert.equal(rows.filter((row) => row.region === 'GYEONGNAM').length, 18);
  assert.equal(rows.filter((row) => row.region === 'JEJU').length, 2);
});

test('duplicate district names stay unique across regions', () => {
  const jung = matchingMatrixRows().filter((row) => String(row.city).includes('중구'));
  assert.ok(jung.length >= 6);
  assert.equal(new Set(jung.map((row) => row.id)).size, jung.length);
  assert.ok(jung.some((row) => row.id === 'SEOUL:중구'));
  assert.ok(jung.some((row) => row.id === 'INCHEON:인천-중구'));
  assert.ok(jung.some((row) => row.id === 'BUSAN:부산-중구'));
  const seoulJung = jung.find((row) => row.id === 'SEOUL:중구');
  assert.equal(seoulJung?.officerName, '중구 담당');
});

test('TourAPI areaCode maps 1:1 to 17 metropolitan zones', () => {
  assert.equal(REGION_PRESETS.length, 17);
  assert.equal(ALL_TOUR_AREA_CODES.length, 17);
  assert.equal(new Set(ALL_TOUR_AREA_CODES).size, 17);
  assert.equal(regionalZoneFor('1'), 'SEOUL');
  assert.equal(regionalZoneFor('6'), 'BUSAN');
  assert.equal(regionalZoneFor('4'), 'DAEGU');
  assert.equal(regionalZoneFor('2'), 'INCHEON');
  assert.equal(regionalZoneFor('5'), 'GWANGJU');
  assert.equal(regionalZoneFor('3'), 'DAEJEON');
  assert.equal(regionalZoneFor('7'), 'ULSAN');
  assert.equal(regionalZoneFor('8'), 'SEJONG');
  assert.equal(regionalZoneFor('31'), 'GYEONGGI');
  assert.equal(regionalZoneFor('32'), 'GANGWON');
  assert.equal(regionalZoneFor('33'), 'CHUNGBUK');
  assert.equal(regionalZoneFor('34'), 'CHUNGNAM');
  assert.equal(regionalZoneFor('35'), 'JEONBUK');
  assert.equal(regionalZoneFor('36'), 'JEONNAM');
  assert.equal(regionalZoneFor('37'), 'GYEONGBUK');
  assert.equal(regionalZoneFor('38'), 'GYEONGNAM');
  assert.equal(regionalZoneFor('39'), 'JEJU');
  assert.equal(regionalZoneFor(undefined, 'CHUNGCHEONG'), 'CHUNGNAM');
  assert.equal(regionalZoneFor(undefined, 'JEOLLA'), 'JEONBUK');
  assert.equal(regionalZoneFor(undefined, 'GYEONGSANG'), 'GYEONGNAM');
});
