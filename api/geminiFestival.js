const GENERIC_MARKERS = [
  '확인되는 대로',
  '추천코스로 이을 수',
  '의 상세 개요입니다',
  'TourAPI에서 수집한 행사',
  'TourAPI에서 수집한 축제',
  'TourAPI에서 수집한 맛집',
  '주최 기관 안내를 따르며',
];

/**
 * 신규 Gemini 키는 1.5/2.5 모델 id를 못 쓰는 경우가 많다.
 * 이 프롬프트는 gemini-flash-latest JSON이 가장 안정적이고,
 * gemini-3.6-flash는 출력이 잘리면 파싱에 실패할 수 있다.
 */
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-3.6-flash'];

const cache = new Map();
const CACHE_LIMIT = 80;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

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

export function isGenericFestivalOverview(text) {
  const value = String(text || '').trim();
  if (!value) return true;
  return GENERIC_MARKERS.some((marker) => value.includes(marker));
}

export function cacheKey(input) {
  const row = input || {};
  return [
    String(row.title || '').trim(),
    String(row.place || '').trim(),
    String(row.startDate || '').trim(),
    String(row.endDate || '').trim(),
    String(row.metro || '').trim(),
  ].join('|').toLowerCase();
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

async function generateWithModel(model, prompt, key, fetchImpl, timeoutMs) {
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
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
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

  const fallback = localFestivalSummary(input);
  const apiKey = options.apiKey !== undefined
    ? String(options.apiKey || '').trim()
    : geminiApiKey();
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (!apiKey || typeof fetchImpl !== 'function') {
    const value = { ...fallback, source: 'fallback' };
    remember(key, value);
    return { ...value, cached: false };
  }

  const prompt = buildPrompt(input);
  const timeoutMs = Number(options.timeoutMs) || 12000;
  const models = options.models || GEMINI_MODELS;
  let lastError = null;
  for (const model of models) {
    try {
      const parsed = await generateWithModel(model, prompt, apiKey, fetchImpl, timeoutMs);
      if (!parsed) continue;
      const value = { ...normalizeSummary(parsed, fallback), source: 'gemini', model };
      remember(key, value);
      return { ...value, cached: false };
    } catch (err) {
      lastError = err;
      if (Number(err?.status) === 429) break;
    }
  }

  const value = { ...fallback, source: 'fallback', error: lastError ? String(lastError.message || lastError) : undefined };
  remember(key, value);
  return { ...value, cached: false };
}

export function clearGeminiCache() {
  cache.clear();
}
