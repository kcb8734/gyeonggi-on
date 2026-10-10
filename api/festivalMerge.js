function festivalKey(item) {
  const title = String(item && item.title || '').trim();
  if (title) return `title:${title}`;
  return String(item && (item.contentId || item.id) || '').trim();
}

export function mergeFestivalSources(...groups) {
  const out = [];
  const seen = new Set();
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

export function firstNonEmptyFestivals(...groups) {
  for (const group of groups) {
    if (group && group.length) return group;
  }
  return [];
}
