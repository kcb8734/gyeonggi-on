import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildPrompt,
  cacheKey,
  clearGeminiCache,
  isGenericFestivalOverview,
  localFestivalSummary,
  normalizeSummary,
  parseModelJson,
  summarizeFestival,
} from './geminiFestival.js';

test('TourAPI 껍데기 개요는 Gemini 대체 대상으로 본다', () => {
  assert.equal(isGenericFestivalOverview('한국관광공사 TourAPI에서 수집한 행사 개요입니다.'), true);
  assert.equal(isGenericFestivalOverview('고양 호수공원에서 야외 전시가 이어집니다.'), false);
  assert.equal(isGenericFestivalOverview(''), true);
});

test('모델 JSON 펜스와 핵심 포인트 3개를 정규화한다', () => {
  const parsed = parseModelJson('```json\n{"overview":"소개","highlights":["하나","둘"],"tips":"편한 신발"}\n```');
  const summary = normalizeSummary(parsed, localFestivalSummary({ title: '테스트축제' }));
  assert.equal(summary.overview, '소개');
  assert.equal(summary.highlights.length, 3);
  assert.equal(summary.highlights[0], '하나');
  assert.match(summary.tips, /편한 신발/);
});

test('API 키가 없으면 로컬 요약을 바로 준다', async () => {
  clearGeminiCache();
  const result = await summarizeFestival({
    title: '세종축제',
    place: '세종특별자치시',
    startDate: '2026-10-10',
    endDate: '2026-10-12',
    metro: 'SEJONG',
  }, { apiKey: '' });
  assert.equal(result.source, 'fallback');
  assert.equal(result.highlights.length, 3);
  assert.match(result.overview, /세종축제/);
  assert.match(result.tips, /신발|교통|시장/);
});

test('Gemini 응답이 오면 source=gemini 로 캐시한다', async () => {
  clearGeminiCache();
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              overview: '호수공원에서 도시 전시를 여는 고양 대표 예술제입니다.',
              highlights: ['야외 전시', '시민 참여 프로그램', '호수 산책 동선'],
              tips: '주말에는 주차보다 지하철을 이용하세요.',
            }),
          }],
        },
      }],
    }),
  });
  const first = await summarizeFestival({
    title: '고양미술축제',
    place: '경기도 고양시',
    metro: 'GYEONGGI',
  }, { apiKey: 'test-key', fetchImpl, models: ['gemini-3.6-flash'] });
  assert.equal(first.source, 'gemini');
  assert.equal(first.cached, false);
  assert.equal(first.highlights[0], '야외 전시');
  const second = await summarizeFestival({
    title: '고양미술축제',
    place: '경기도 고양시',
    metro: 'GYEONGGI',
  }, { apiKey: 'test-key', fetchImpl });
  assert.equal(second.cached, true);
  assert.equal(cacheKey({ title: '고양미술축제', place: '경기도 고양시', metro: 'GYEONGGI' }), secondKey());
  function secondKey() {
    return cacheKey({ title: '고양미술축제', place: '경기도 고양시', metro: 'GYEONGGI' });
  }
});

test('프롬프트에 축제명과 빈 개요 안내가 들어간다', () => {
  const prompt = buildPrompt({ title: '제주들불축제', metro: 'JEJU', place: '제주시' });
  assert.match(prompt, /제주들불축제/);
  assert.match(prompt, /한국관광공사 상세 개요 없음/);
  assert.match(prompt, /highlights/);
});

test('빈 JSON이면 다음 모델로 넘어간다', async () => {
  clearGeminiCache();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) {
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '' }] } }] }) };
    }
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                overview: '대체 모델 개요입니다.',
                highlights: ['포인트1', '포인트2', '포인트3'],
                tips: '대중교통을 이용하세요.',
              }),
            }],
          },
        }],
      }),
    };
  };
  const result = await summarizeFestival({
    title: '보령머드축제',
    place: '충청남도 보령시',
    metro: 'CHUNGNAM',
  }, { apiKey: 'test-key', fetchImpl, models: ['gemini-3.6-flash', 'gemini-flash-latest'] });
  assert.equal(calls, 2);
  assert.equal(result.source, 'gemini');
  assert.equal(result.model, 'gemini-flash-latest');
  assert.equal(result.overview, '대체 모델 개요입니다.');
});

test('404 모델은 건너뛰고 다음 모델을 쓴다', async () => {
  clearGeminiCache();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) {
      return { ok: false, status: 404, json: async () => ({ error: { message: 'not found' } }) };
    }
    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                overview: '최신 플래시 개요입니다.',
                highlights: ['첫째', '둘째', '셋째'],
                tips: '편한 신발을 신으세요.',
              }),
            }],
          },
        }],
      }),
    };
  };
  const result = await summarizeFestival({
    title: '진주남강유등축제',
    place: '경상남도 진주시',
    metro: 'GYEONGNAM',
  }, { apiKey: 'test-key', fetchImpl, models: ['gemini-2.5-flash', 'gemini-flash-latest'] });
  assert.equal(calls, 2);
  assert.equal(result.source, 'gemini');
  assert.equal(result.model, 'gemini-flash-latest');
});
