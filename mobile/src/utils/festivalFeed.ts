import { festivalImageFor } from '../constants/regionMedia';
import type { HomeFestival } from '../types/home';
import { secureMediaUrl } from './mediaUrl';

function festivalKey(item: HomeFestival) {
  const title = String(item.title || '').trim();
  if (title) return `title:${title}`;
  return String(item.contentId || item.id || '').trim();
}

export function mergeFestivalSources(...groups: HomeFestival[][]) {
  const out: HomeFestival[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const item of group || []) {
      const key = festivalKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

/** DB 수집분이 있으면 더미 폴백을 붙이지 않는다. */
export function preferPersistedFestivalList(
  listed: HomeFestival[],
  tour: HomeFestival[] = [],
  feed: HomeFestival[] = [],
  fallbacks: HomeFestival[] = [],
) {
  const live = mergeFestivalSources(listed, tour, feed);
  return live.length ? live : mergeFestivalSources(live, fallbacks);
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
