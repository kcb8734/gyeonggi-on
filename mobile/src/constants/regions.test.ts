import assert from 'node:assert/strict';
import { test } from 'node:test';
import { METRO_REGIONS, METRO_REGIONS_BY_LABEL } from './regions';

test('홈 권역 버튼은 가나다 순이다', () => {
  assert.equal(METRO_REGIONS_BY_LABEL.length, 17);
  assert.deepEqual(
    METRO_REGIONS_BY_LABEL.map((item) => item.label),
    [
      '강원온', '경기온', '경남온', '경북온', '광주온', '대구온', '대전온', '부산온',
      '서울온', '세종온', '울산온', '인천온', '전남온', '전북온', '제주온', '충남온', '충북온',
    ],
  );
  assert.equal(METRO_REGIONS[0].id, 'SEOUL');
});
