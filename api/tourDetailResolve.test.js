import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isGenericFestivalOverview } from './genericOverview.js';
import {
  attachGeminiOverview,
  homeRowToDetail,
  looksLikeKorTourId,
  needsGeminiOverview,
  queryToDetail,
  resolveTourDetail,
} from './tourDetailResolve.js';

test('숫자 TourAPI id만 한국관광공사 상세를 친다', () => {
  assert.equal(looksLikeKorTourId('3488421'), true);
  assert.equal(looksLikeKorTourId('paju-jangdan'), false);
  assert.equal(looksLikeKorTourId('f34fee36-df66-4513-a687-9b3a9f208517'), false);
});

test('장소명만 있는 한 줄은 Gemini 대상이다', () => {
  assert.equal(isGenericFestivalOverview('국립극장 무대예술지원센터'), true);
  assert.equal(isGenericFestivalOverview('대부바다향기테마파크'), true);
  assert.equal(needsGeminiOverview('임진각에서 열리는 파주 대표 콩·한우 미식 축제'), true);
  assert.equal(isGenericFestivalOverview('세미원에서 연꽃이 만개합니다.'), false);
});

test('builtin slug는 TourAPI 없이 상세를 만든다', async () => {
  const detail = await resolveTourDetail('paju-jangdan', {}, {
    getTourDetail2: async () => {
      throw new Error('should not call tour');
    },
  });
  assert.equal(detail.title, '파주 장단콩축제');
  assert.match(detail.address, /임진각/);
});

test('UUID는 제목 쿼리로 합성 상세를 준다', async () => {
  const detail = await resolveTourDetail('f34fee36-df66-4513-a687-9b3a9f208517', {
    title: '국립양평치유의숲 신선(神仙)한 숲여행',
    address: '국립양평치유의숲',
    metro: 'GYEONGGI',
  }, {
    getTourDetail2: async () => {
      throw new Error('should not call tour');
    },
  });
  assert.match(detail.title, /양평/);
  assert.equal(detail.overview, '');
});

test('짧은 개요는 Gemini 상세로 덮어쓴다', async () => {
  const detail = homeRowToDetail({
    contentId: 'paju-jangdan',
    title: '파주 장단콩축제',
    address: '파주 임진각',
    overview: '임진각에서 열리는 파주 대표 콩·한우 미식 축제',
    category: '먹거리',
  }, 'paju-jangdan');
  const withAi = await attachGeminiOverview(detail, { metro: 'GYEONGGI' }, {
    summarizeFestival: async () => ({
      source: 'gemini',
      overview: '파주 임진각에서 장단콩과 한우를 선보이는 미식 축제입니다. 직거래 장터와 콩 음식 체험이 이어집니다.',
      highlights: ['장터', '체험', '한우'],
      tips: '편한 신발을 신으세요.',
      model: 'gemini-3.6-flash',
    }),
  });
  assert.equal(withAi.aiSource, 'gemini');
  assert.match(withAi.overview, /직거래 장터/);
});

test('queryToDetail는 클라이언트 fallback 제목을 쓴다', () => {
  const detail = queryToDetail('abc', { title: '포은문화제', address: '여주시', metro: 'GYEONGGI' });
  assert.equal(detail.title, '포은문화제');
  assert.equal(detail.address, '여주시');
});
