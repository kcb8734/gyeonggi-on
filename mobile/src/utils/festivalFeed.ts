import type { HomeFestival } from '../types/home';

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

export function matchesFestivalCategory(item: HomeFestival, category: string) {
  const wanted = String(category || '').trim();
  if (!wanted || wanted === '전체') return true;
  const source = String(item.source || '');
  const actual = String(item.category || '');
  if (wanted === '계절축제' && (actual === '계절축제' || source === 'excel' || source === 'survey' || source === 'xlsx')) {
    return true;
  }
  if (wanted === '문화/예술' && (actual === '문화/예술' || actual === '문화예술')) return true;
  return actual === wanted;
}

export function firstNonEmptyFestivals(...groups: HomeFestival[][]) {
  for (const group of groups) {
    if (group?.length) return group;
  }
  return [];
}
