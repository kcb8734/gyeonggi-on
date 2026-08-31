import { festivalImageFor } from '../constants/regionMedia';
import type { HomeFestival } from '../types/home';
import { secureMediaUrl } from './mediaUrl';

export function normalizeFestivalTitle(title?: string | null) {
  return String(title || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/【[^】]*】/g, ' ')
    .replace(/제\s*\d+\s*회/g, ' ')
    .replace(/20\d{2}/g, ' ')
    .replace(/[^\w가-힣]/g, '')
    .toLowerCase()
    .trim();
}

function placeToken(item: HomeFestival) {
  return String(item.location_name || item.municipality_name || '').replace(/[^\w가-힣]/g, '').slice(0, 16);
}

function sourceRank(source?: string | null) {
  const value = String(source || '').toLowerCase();
  if (value === 'tour' || value === 'tourapi') return 0;
  if (value === 'seoul') return 1;
  if (value === 'ggc' || value === 'gg') return 2;
  if (value === 'ifac' || value === 'incheon') return 3;
  if (value === 'sample' || value === 'fallback') return 90;
  return 20;
}

function isSimilarFestival(a: HomeFestival, b: HomeFestival) {
  const ta = normalizeFestivalTitle(a.title);
  const tb = normalizeFestivalTitle(b.title);
  if (!ta || !tb) return false;
  const exactTitle = ta === tb;
  const fuzzyTitle = ta.length >= 6 && tb.length >= 6 && (ta.includes(tb) || tb.includes(ta));
  if (!exactTitle && !fuzzyTitle) return false;
  const da = String(a.start_date || '').replace(/\D/g, '').slice(0, 8);
  const db = String(b.start_date || '').replace(/\D/g, '').slice(0, 8);
  const dateHit = !da || !db || Math.abs(Number(da) - Number(db)) <= 3;
  if (!dateHit) return false;
  if (exactTitle) return true;
  const pa = placeToken(a);
  const pb = placeToken(b);
  if (!pa || !pb) return true;
  return pa.slice(0, 4) === pb.slice(0, 4) || pa.includes(pb.slice(0, 4)) || pb.includes(pa.slice(0, 4));
}

export function mergeFestivalMasters(...groups: HomeFestival[][]) {
  const items: HomeFestival[] = [];
  for (const group of groups) {
    for (const item of group || []) {
      if (!item || sourceRank(item.source) >= 90) continue;
      items.push(item);
    }
  }
  items.sort((a, b) => sourceRank(a.source) - sourceRank(b.source));
  const out: HomeFestival[] = [];
  for (const item of items) {
    if (out.some((row) => isSimilarFestival(row, item))) continue;
    out.push(item);
  }
  return out;
}

export function mergeFestivalSources(...groups: HomeFestival[][]) {
  return mergeFestivalMasters(...groups);
}

/** DB·TourAPI 실데이터가 있으면 더미 폴백을 붙이지 않는다. TourAPI를 마스터로 둔다. */
export function preferPersistedFestivalList(
  listed: HomeFestival[],
  tour: HomeFestival[] = [],
  feed: HomeFestival[] = [],
  fallbacks: HomeFestival[] = [],
) {
  const live = mergeFestivalMasters(tour, listed, feed);
  return live.length ? live : mergeFestivalMasters(fallbacks);
}

export function firstNonEmptyFestivals(...groups: HomeFestival[][]) {
  for (const group of groups) {
    if (group?.length) return group;
  }
  return [];
}

/** 리스트에서 보던 이미지를 상세에도 그대로 쓴다. TourAPI firstimage가 달라도 덮지 않는다. */
export function festivalListHeroUrl(
  festival?: Pick<HomeFestival, 'title' | 'location_name' | 'image_url' | 'metro' | 'regionalZone'> | null,
  extra?: { imageUrl?: string | null; address?: string | null; metro?: string | null; title?: string | null },
): string {
  const title = extra?.title || festival?.title;
  const address = extra?.address || festival?.location_name;
  const metro = extra?.metro || festival?.metro || festival?.regionalZone;
  return secureMediaUrl(extra?.imageUrl || festival?.image_url)
    || festivalImageFor(title, address, metro);
}

export function tourDetailParams(festival: HomeFestival, metro?: string) {
  return {
    contentId: festival.contentId || festival.id,
    contentTypeId: festival.contentTypeId,
    tel: festival.tel,
    title: festival.title,
    city: festival.municipality_name ?? undefined,
    address: festival.location_name ?? undefined,
    latitude: festival.latitude,
    longitude: festival.longitude,
    metro: festival.metro ?? festival.regionalZone ?? metro,
    imageUrl: festivalListHeroUrl(festival, { metro }),
  };
}
