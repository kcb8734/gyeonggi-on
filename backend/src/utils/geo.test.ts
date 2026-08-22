import assert from 'node:assert/strict';
import { test } from 'node:test';
import { haversineKmSql, parseOptionalFloat, toNumber } from './geo';

test('haversineKmSql interpolates lat/lng parameter indexes', () => {
  const sql = haversineKmSql(1, 2, 'f.latitude', 'f.longitude');
  assert.match(sql, /\$1/);
  assert.match(sql, /\$2/);
  assert.match(sql, /f\.latitude/);
  assert.match(sql, /f\.longitude/);
});

test('parseOptionalFloat handles missing and invalid values', () => {
  assert.equal(parseOptionalFloat(undefined), null);
  assert.equal(parseOptionalFloat(''), null);
  assert.equal(parseOptionalFloat('abc'), null);
  assert.equal(parseOptionalFloat('37.5'), 37.5);
  assert.equal(parseOptionalFloat(-127.1), -127.1);
});

test('toNumber falls back for non-numeric pg values', () => {
  assert.equal(toNumber('10.00'), 10);
  assert.equal(toNumber(null, 0), 0);
  assert.equal(toNumber('x', -1), -1);
});
