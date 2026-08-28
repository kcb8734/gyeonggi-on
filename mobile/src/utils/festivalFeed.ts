import type { HomeFestival } from '../types/home';

function festivalKey(item: HomeFestival) {
  return String(item.contentId || item.id || item.title || '').trim();
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

export function firstNonEmptyFestivals(...groups: HomeFestival[][]) {
  for (const group of groups) {
    if (group?.length) return group;
  }
  return [];
}
