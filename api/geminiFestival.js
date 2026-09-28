import { isGenericFestivalOverview } from './genericOverview.js';

export { isGenericFestivalOverview } from './genericOverview.js';

/**
 * flash-latest는 Gemini 3.8로 바뀌면 thinkingBudget·MINIMAL·temperature를 거절한다.
 * 축제 JSON은 3.6 MINIMAL이 싸고 안정적이라 먼저 쓰고, 3.8 계열은 LOW만 보낸다.
 */
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest'];

/** thinkingBudget과 thinkingLevel을 같이 보내면 Gemini가 400으로 거절한다. */
export function thinkingConfigFor(model) {
  const name = String(model || '').toLowerCase();
  if (/3\.6|3\.5|3-flash-preview/.test(name)) {
    return { thinkingLevel: 'minimal' };
  }
  if (/3\.8|3\.7|3\.1|flash-latest|gemini-3/.test(name)) {
    return { thinkingLevel: 'low' };
  }
  return { thinkingBudget: 0 };
}

export function generationConfigFor(model, options = {}) {
  const name = String(model || '').toLowerCase();
  const is38Family = /3\.8|flash-latest/.test(name);
  const config = {
    maxOutputTokens: is38Family ? 8192 : 2048,
    responseMimeType: 'application/json',
  };
  if (!is38Family) config.temperature = 0.4;
  if (!options.omitThinking) config.thinkingConfig = thinkingConfigFor(model);
  return config;
}

export function isThinkingConfigError(err) {
  const msg = String(err?.message || err || '');
  return /thinking budget|thinking level|thinkingConfig|thinking_budget|thinking_level|temperature/i.test(msg);
}

const cache = new Map();
const inflight = new Map();
const CACHE_LIMIT = 80;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let defaultStorePromise = null;

function getDefaultStore() {
  if (!defaultStorePromise) {
    defaultStorePromise = import('./festivalAiStore.js').then((mod) => mod.postgresSummaryStore);
  }
  return defaultStorePromise;
}

export function geminiApiKey() {
  return String(
    process.env.GEMINI_API_KEY
    || process.env.GOOGLE_GEMINI_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || '',
  ).trim();
}

export function geminiConfigured() {
  return Boolean(geminiApiKey());
}

export function cacheKey(input) {
  const row = input || {};
  const title = String(row.title || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const metro = String(row.metro || '').trim().toUpperCase();
  // 팝업·상세는 주소/일정이 달라도 같은 축제 상세를 재사용한다.
  return `${title}|${metro}`;
}

export function parseModelJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = (fenced ? fenced[1] : raw).trim();
  const start = jsonText.indexOf('{');
  const end = jsonText.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(jsonText.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function normalizeSummary(parsed, fallback) {
  const base = fallback || localFestivalSummary({});
  const highlights = Array.isArray(parsed?.highlights)
    ? parsed.highlights.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
    : [];
  while (highlights.length < 3 && base.highlights[highlights.length]) {
    highlights.push(base.highlights[highlights.length]);
  }
  return {
    overview: String(parsed?.overview || base.overview).trim() || base.overview,
    highlights: highlights.slice(0, 3),
    tips: String(parsed?.tips || base.tips).trim() || base.tips,
  };
}

export function localFestivalSummary(input) {
  const title = String(input?.title || '이 축제').trim() || '이 축제';
  const place = String(input?.place || input?.metro || '행사 장소').trim() || '행사 장소';
  const period = [input?.startDate, input?.endDate].filter(Boolean).join(' ~ ') || '행사 기간';
  const category = String(input?.category || '문화/예술').trim() || '문화/예술';
  return {
    overview: `${title}은 ${place}에서 ${period} 열리는 ${category} 행사입니다. 한국관광공사 상세 개요가 아직 확인되지 않아, 축제명·장소·기간을 바탕으로 방문 전 참고할 소개를 정리했습니다. 공연·체험·먹거리 운영 시간과 우천 안내는 현장·주최 측 공지를 우선하세요.`,
    highlights: [
      `${title}의 메인 프로그램과 현장 분위기를 중심으로 둘러보기`,
      `${place} 안내 부스에서 동선·운영 시간을 먼저 확인하기`,
      '가족·연인이 함께 즐길 수 있는 체험·먹거리 코너를 여유 있게 둘러보기',
    ],
    tips: '편한 신발과 날씨 대비 옷차림을 준비하고, 대중교통·주차·셔틀 여부를 미리 확인하세요. 대기 시간이 길면 인근 전통시장이나 상생 가게에서 식사하면 동선을 줄일 수 있습니다.',
  };
}

function remember(key, value) {
  if (!value || value.source !== 'gemini') return;
  if (isGenericFestivalOverview(value.overview)) return;
  cache.set(key, { at: Date.now(), value });
  if (cache.size <= CACHE_LIMIT) return;
  const oldest = cache.keys().next().value;
  cache.delete(oldest);
}

function cached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

export function buildPrompt(input) {
  const title = String(input?.title || '').trim();
  const place = String(input?.place || '').trim() || '미확인';
  const metro = String(input?.metro || '').trim() || '미확인';
  const period = [input?.startDate, input?.endDate].filter(Boolean).join(' ~ ') || '미확인';
  const category = String(input?.category || '').trim() || '미확인';
  const overview = isGenericFestivalOverview(input?.overview) ? '' : String(input?.overview || '').trim();
  return [
    '너는 한국 지역 축제 안내 에디터다. JSON만 출력한다.',
    '확인되지 않은 예매처·요금·정확한 관람 인원은 단정하지 말고, 주최 측 안내를 확인하라는 표현을 쓴다.',
    '필드:',
    '- overview: 한국어 3~5문장 상세 개요',
    '- highlights: 주요 행사 내용 및 핵심 포인트 3가지(문자열 배열, 각 1문장)',
    '- tips: 방문객 맞춤형 팁 2~4문장(교통, 복장, 주변 먹거리, 가족 관람)',
    '',
    `축제명: ${title}`,
    `권역: ${metro}`,
    `개최장소: ${place}`,
    `기간: ${period}`,
    `카테고리: ${category}`,
    `기존소개: ${overview || '(한국관광공사 상세 개요 없음)'}`,
  ].join('\n');
}

async function generateOnce(model, prompt, key, fetchImpl, timeoutMs, generationConfig) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = body?.error?.message || `Gemini HTTP ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    const text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
    return parseModelJson(text);
  } finally {
    clearTimeout(timer);
  }
}

async function generateWithModel(model, prompt, key, fetchImpl, timeoutMs) {
  try {
    return await generateOnce(model, prompt, key, fetchImpl, timeoutMs, generationConfigFor(model));
  } catch (err) {
    if (Number(err?.status) === 429 || !isThinkingConfigError(err)) throw err;
    return generateOnce(model, prompt, key, fetchImpl, timeoutMs, generationConfigFor(model, { omitThinking: true }));
  }
}

async function summarizeFestivalUncached(input, options, key) {
  const store = options.store === undefined ? await getDefaultStore() : options.store;
  if (store && typeof store.load === 'function') {
    const stored = await store.load(input);
    if (stored && stored.overview && !isGenericFestivalOverview(stored.overview)) {
      const value = { ...stored, source: 'gemini', cached: true, stored: true };
      remember(key, value);
      return value;
    }
  }

  const fallback = localFestivalSummary(input);
  const apiKey = options.apiKey !== undefined
    ? String(options.apiKey || '').trim()
    : geminiApiKey();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (!apiKey || typeof fetchImpl !== 'function') {
    const value = { ...fallback, source: 'fallback' };
    return { ...value, cached: false };
  }

  const prompt = buildPrompt(input);
  const timeoutMs = Number(options.timeoutMs) || 20000;
  const models = options.models || GEMINI_MODELS;
  let lastError = null;
  for (const model of models) {
    try {
      const parsed = await generateWithModel(model, prompt, apiKey, fetchImpl, timeoutMs);
      if (!parsed) continue;
      const value = { ...normalizeSummary(parsed, fallback), source: 'gemini', model, stored: false };
      remember(key, value);
      if (store && typeof store.save === 'function') {
        try { await store.save(input, value); } catch { /* 저장 실패해도 응답은 준다 */ }
      }
      return { ...value, cached: false };
    } catch (err) {
      lastError = err;
      if (Number(err?.status) === 429) break;
    }
  }

  const value = { ...fallback, source: 'fallback', error: lastError ? String(lastError.message || lastError) : undefined };
  return { ...value, cached: false };
}

export async function summarizeFestival(input, options = {}) {
  const title = String(input?.title || '').trim();
  if (!title) {
    const err = new Error('축제명이 필요합니다.');
    err.status = 400;
    throw err;
  }
  const key = cacheKey(input);
  const hit = cached(key);
  if (hit) return { ...hit, cached: true };

  if (inflight.has(key)) {
    const shared = await inflight.get(key);
    return { ...shared, cached: true };
  }

  const work = summarizeFestivalUncached(input, options, key);
  inflight.set(key, work);
  try {
    return await work;
  } finally {
    inflight.delete(key);
  }
}

export function clearGeminiCache() {
  cache.clear();
  inflight.clear();
}
