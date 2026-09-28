import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isGenericFestivalOverview } from './genericOverview.js';

test('관광공사 대기 문구는 공백이 없어도 껍데기로 본다', () => {
  assert.equal(isGenericFestivalOverview('한국관광공사에서 수집한 행사 정보입니다. 상세개요가 확인되는대로 자동 반영됩니다.'), true);
  assert.equal(isGenericFestivalOverview('한국관광공사 TourAPI에서 수집한 행사 정보입니다. 상세 개요가 확인되는 대로 자동 반영됩니다.'), true);
  assert.equal(isGenericFestivalOverview('파주장단콩축제 상세 개요'), true);
  assert.equal(isGenericFestivalOverview('수원화성문화제의 상세 개요입니다.'), true);
  assert.equal(isGenericFestivalOverview('국립극장 무대예술지원센터'), true);
  assert.equal(isGenericFestivalOverview('임진각에서 장단콩 직거래 장터가 열립니다.'), false);
});
