import assert from 'node:assert/strict';
import test from 'node:test';
import { matchingMatrixRows, METRO_LOCALITIES } from './metroLocalities';

test('matching matrix covers all 8 metro regions with unique ids', () => {
  const rows = matchingMatrixRows();
  const regions = [...new Set(rows.map((row) => row.region))];
  assert.deepEqual(regions, Object.keys(METRO_LOCALITIES));
  assert.equal(rows.length, Object.values(METRO_LOCALITIES).reduce((sum, locs) => sum + locs.length, 0));
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
  assert.equal(rows.filter((row) => row.region === 'GYEONGGI').length, 31);
  assert.equal(rows.filter((row) => row.region === 'SEOUL').length, 25);
  assert.equal(rows.filter((row) => row.region === 'JEJU').length, 2);
});

test('duplicate district names stay unique across regions', () => {
  const jung = matchingMatrixRows().filter((row) => String(row.city).includes('중구'));
  assert.ok(jung.length >= 6);
  assert.equal(new Set(jung.map((row) => row.id)).size, jung.length);
  assert.ok(jung.some((row) => row.id === 'SEOUL:중구'));
  assert.ok(jung.some((row) => row.id === 'INCHEON:인천-중구'));
});
