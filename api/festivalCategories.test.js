import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  categoryForFestival,
  classifyFestival,
  matchesFestivalCategory,
} from './festivalCategories.js';

test('classifyFestival maps culture performances and exhibits', () => {
  assert.equal(classifyFestival('수원 야시장 플리마켓'), '플리마켓');
  assert.equal(classifyFestival('영동시장 먹거리 축제'), '먹거리');
  assert.equal(classifyFestival('어린이 가족 체험 한마당'), '가족');
  assert.equal(classifyFestival('세미원 연꽃문화제'), '계절축제');
  assert.equal(classifyFestival('로맨틱연극 그녀를 믿지마세요'), '공연');
  assert.equal(classifyFestival('이주현 피아노 리사이틀'), '공연');
  assert.equal(classifyFestival('자연을 바라보는 그림전'), '문화/예술');
  assert.equal(classifyFestival('한글문화특별기획전', '전시'), '문화/예술');
  assert.equal(classifyFestival('울산 도자기 원데이클래스'), '체험');
});

test('excel source is always 계절축제', () => {
  assert.equal(categoryForFestival({ title: '수원화성문화제', source: 'excel', category: '문화/예술' }), '계절축제');
  assert.equal(matchesFestivalCategory({ title: '수원화성문화제', source: 'excel', category: '문화/예술' }, '계절축제'), true);
  assert.equal(matchesFestivalCategory({ title: '타인의 삶', source: 'bscf', category: '공연' }, '공연'), true);
});
