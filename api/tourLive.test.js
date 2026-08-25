import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KOR_SERVICE2, resolveFestivalQuery } from './tourLive.js';

test('GYEONGGI uses KorService2 searchFestival2 with lDongRegnCd 41, not KorService1', () => {
  const query = resolveFestivalQuery({ metro: 'GYEONGGI' });
  assert.equal(query.baseUrl, KOR_SERVICE2);
  assert.equal(query.path, '/searchFestival2');
  assert.equal(query.params.lDongRegnCd, '41');
  assert.equal(query.params.areaCode, undefined);
  assert.ok(!JSON.stringify(query).includes('KorService1'));
  assert.ok(!JSON.stringify(query).includes('searchFestival1'));
});

test('BUSAN uses lDongRegnCd 26 instead of legacy areaCode 6', () => {
  const query = resolveFestivalQuery({ metro: 'BUSAN' });
  assert.equal(query.metro, 'BUSAN');
  assert.equal(query.params.lDongRegnCd, '26');
  assert.equal(query.areaCode, '6');
  assert.equal(query.params.areaCode, undefined);
});

test('nationwide all omits region filters', () => {
  const query = resolveFestivalQuery({ areaCode: 'all' });
  assert.equal(query.nationwide, true);
  assert.equal(query.params.lDongRegnCd, undefined);
  assert.equal(query.params.areaCode, undefined);
  assert.equal(query.params.contentTypeId, '15');
});
