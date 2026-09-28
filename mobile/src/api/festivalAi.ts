import { api } from './client';
import { CANONICAL_ORIGIN, canonicalizeApiOrigin, API_BASE_URL } from '../config';

export type FestivalAiSummary = {
  overview: string;
  highlights: string[];
  tips: string;
  source: 'gemini' | 'fallback';
  model?: string;
  cached?: boolean;
  stored?: boolean;
};

export type FestivalAiQuery = {
  title: string;
  place?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  metro?: string | null;
  category?: string | null;
  overview?: string | null;
};

const clientCache = new Map<string, FestivalAiSummary>();
const clientInflight = new Map<string, Promise<FestivalAiSummary | null>>();

export function festivalAiClientKey(query: FestivalAiQuery): string {
  const title = String(query.title || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const metro = String(query.metro || '').trim().toUpperCase();
  return `${title}|${metro}`;
}

export function clearFestivalAiClientCache() {
  clientCache.clear();
  clientInflight.clear();
}

export function readFestivalAiClientCache(query: FestivalAiQuery): FestivalAiSummary | null {
  const hit = clientCache.get(festivalAiClientKey(query));
  return hit || null;
}

export function rememberFestivalAiClientCache(query: FestivalAiQuery, value: FestivalAiSummary) {
  if (!value?.overview) return;
  if (value.source !== 'gemini') return;
  clientCache.set(festivalAiClientKey(query), { ...value, cached: true });
}

export function localFestivalAiSummary(query: FestivalAiQuery): FestivalAiSummary {
  const title = String(query.title || '이 축제').trim() || '이 축제';
  const place = String(query.place || query.metro || '행사 장소').trim() || '행사 장소';
  const period = [query.startDate, query.endDate].filter(Boolean).join(' ~ ') || '행사 기간';
  const category = String(query.category || '문화/예술').trim() || '문화/예술';
  return {
    overview: `${title}은 ${place}에서 ${period} 열리는 ${category} 행사입니다. 한국관광공사 상세 개요가 아직 확인되지 않아, 축제명·장소·기간을 바탕으로 방문 전 참고할 소개를 정리했습니다. 공연·체험·먹거리 운영 시간과 우천 안내는 현장·주최 측 공지를 우선하세요.`,
    highlights: [
      `${title}의 메인 프로그램과 현장 분위기를 중심으로 둘러보기`,
      `${place} 안내 부스에서 동선·운영 시간을 먼저 확인하기`,
      '가족·연인이 함께 즐길 수 있는 체험·먹거리 코너를 여유 있게 둘러보기',
    ],
    tips: '편한 신발과 날씨 대비 옷차림을 준비하고, 대중교통·주차·셔틀 여부를 미리 확인하세요. 대기 시간이 길면 인근 전통시장이나 상생 가게에서 식사하면 동선을 줄일 수 있습니다.',
    source: 'fallback',
  };
}

function summaryPayload(query: FestivalAiQuery) {
  return {
    title: String(query.title || '').trim(),
    place: query.place || '',
    startDate: query.startDate || '',
    endDate: query.endDate || '',
    metro: query.metro || '',
    category: query.category || '',
    overview: query.overview || '',
  };
}

function readSummary(data: unknown): FestivalAiSummary | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as { data?: FestivalAiSummary; overview?: string };
  if (row.data?.overview) return row.data;
  if (row.overview) return row as FestivalAiSummary;
  return null;
}

async function postCanonical(query: FestivalAiQuery): Promise<FestivalAiSummary | null> {
  const origin = canonicalizeApiOrigin(API_BASE_URL || CANONICAL_ORIGIN);
  const res = await fetch(`${origin}/api/festivals/ai-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(summaryPayload(query)),
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  return readSummary(body);
}

async function loadFestivalAiSummary(query: FestivalAiQuery): Promise<FestivalAiSummary | null> {
  const title = String(query.title || '').trim();
  if (!title) return null;
  const payload = summaryPayload(query);
  try {
    const res = await api.post<{ success: boolean; data?: FestivalAiSummary }>(
      '/api/festivals/ai-summary',
      payload,
      { timeout: 25000, maxRedirects: 0 },
    );
    if (res.data?.data?.overview) return res.data.data;
  } catch {
    // apex 308 또는 빈 baseURL 이면 www 로 직접 POST
  }
  try {
    const direct = await postCanonical(query);
    if (direct?.overview) return direct;
  } catch {
    // 네트워크가 없어도 상세 화면은 로컬 안내를 보여 준다
  }
  return localFestivalAiSummary(query);
}

export async function fetchFestivalAiSummary(query: FestivalAiQuery): Promise<FestivalAiSummary | null> {
  const title = String(query.title || '').trim();
  if (!title) return null;
  const cached = readFestivalAiClientCache(query);
  if (cached) return cached;
  const key = festivalAiClientKey(query);
  const pending = clientInflight.get(key);
  if (pending) return pending;
  const work = loadFestivalAiSummary(query).then((result) => {
    if (result?.source === 'gemini') rememberFestivalAiClientCache(query, result);
    return result;
  }).finally(() => {
    clientInflight.delete(key);
  });
  clientInflight.set(key, work);
  return work;
}
