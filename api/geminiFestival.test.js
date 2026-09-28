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
  assert.equal(isGenericFestivalOverview('한국관광공사에서 수집한 행사 정보입니다. 상세개요가 확인되는대로 자동 반영됩니다.'), true);
  assert.equal(isGenericFestivalOverview('고양 호수공원에서 야외 전시가 이어집니다.'), false);
  assert.equal(isGenericFestivalOverview(''), true);
  assert.equal(isGenericFestivalOverview('수원화성문화제 상세 개요'), true);
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
  }, { apiKey: '', store: null });
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
  }, { apiKey: 'test-key', fetchImpl, models: ['gemini-3.6-flash'], store: null });
  assert.equal(first.source, 'gemini');
  assert.equal(first.cached, false);
  assert.equal(first.highlights[0], '야외 전시');
  const second = await summarizeFestival({
    title: '고양미술축제',
    place: '경기도 고양시',
    metro: 'GYEONGGI',
  }, { apiKey: 'test-key', fetchImpl, store: null });
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
  }, { apiKey: 'test-key', fetchImpl, models: ['gemini-3.6-flash', 'gemini-flash-latest'], store: null });
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
  }, { apiKey: 'test-key', fetchImpl, models: ['gemini-2.5-flash', 'gemini-flash-latest'], store: null });
  assert.equal(calls, 2);
  assert.equal(result.source, 'gemini');
  assert.equal(result.model, 'gemini-flash-latest');
});

function geminiOk(overview = '저장된 상세 개요입니다.') {
  return {
    ok: true,
    json: async () => ({
      candidates: [{
        content: {
          parts: [{
            text: JSON.stringify({
              overview,
              highlights: ['핵심1', '핵심2', '핵심3'],
              tips: '편한 신발을 신으세요.',
            }),
          }],
        },
      }],
    }),
  };
}

function memoryStore() {
  const rows = new Map();
  return {
    rows,
    load: async (input) => rows.get(cacheKey(input)) || null,
    save: async (input, value) => {
      if (value.source !== 'gemini') return;
      rows.set(cacheKey(input), {
        overview: value.overview,
        highlights: value.highlights,
        tips: value.tips,
        source: 'gemini',
        model: value.model,
        stored: true,
      });
    },
  };
}

test('팝업과 상세는 장소가 달라도 같은 캐시 키를 쓴다', () => {
  assert.equal(
    cacheKey({ title: '파주 장단콩축제', place: '파주시', metro: 'GYEONGGI' }),
    cacheKey({ title: '파주 장단콩축제', place: '경기도 파주시 임진각로', metro: 'GYEONGGI', startDate: '2026-11-14' }),
  );
});

test('저장된 상세가 있으면 Gemini를 다시 치지 않는다', async () => {
  clearGeminiCache();
  const store = memoryStore();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return geminiOk('장단콩 상세입니다.');
  };
  const first = await summarizeFestival({
    title: '파주 장단콩축제',
    place: '파주시',
    metro: 'GYEONGGI',
  }, { apiKey: 'test-key', fetchImpl, models: ['gemini-flash-latest'], store });
  assert.equal(first.source, 'gemini');
  assert.equal(first.cached, false);
  assert.equal(calls, 1);
  assert.equal(store.rows.size, 1);

  clearGeminiCache();
  const second = await summarizeFestival({
    title: '파주 장단콩축제',
    place: '경기도 파주시 임진각로 148-40',
    startDate: '2026-11-14',
    metro: 'GYEONGGI',
  }, { apiKey: 'test-key', fetchImpl, models: ['gemini-flash-latest'], store });
  assert.equal(calls, 1);
  assert.equal(second.cached, true);
  assert.equal(second.stored, true);
  assert.equal(second.overview, '장단콩 상세입니다.');
});

test('로컬 폴백은 백엔드에 저장하지 않는다', async () => {
  clearGeminiCache();
  const store = memoryStore();
  await summarizeFestival({
    title: '세종축제',
    metro: 'SEJONG',
  }, { apiKey: '', store });
  assert.equal(store.rows.size, 0);
});

test('동시에 같은 축제를 열면 Gemini는 한 번만 호출한다', async () => {
  clearGeminiCache();
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const fetchImpl = async () => {
    calls += 1;
    await gate;
    return geminiOk();
  };
  const input = { title: '수원화성문화제', place: '수원시', metro: 'GYEONGGI' };
  const pending = [
    summarizeFestival(input, { apiKey: 'test-key', fetchImpl, models: ['gemini-flash-latest'], store: null }),
    summarizeFestival({ ...input, place: '수원화성' }, { apiKey: 'test-key', fetchImpl, models: ['gemini-flash-latest'], store: null }),
  ];
  release();
  const [first, second] = await Promise.all(pending);
  assert.equal(calls, 1);
  assert.equal(first.source, 'gemini');
  assert.equal(second.source, 'gemini');
  assert.equal(second.cached, true);
});

