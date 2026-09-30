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

/** 문화재단이 있어도 관광공사·구석구석·저장분을 버리지 않고 합친다. */
export function assembleCollectedFestivals({
  metroKey,
  tourResult = {},
  persisted = [],
  cultureFestivals = [],
  kfesFestivals = [],
  mapTour,
  belongsToMetro,
} = {}) {
  const mapper = typeof mapTour === 'function' ? mapTour : (item) => item;
  const belongs = typeof belongsToMetro === 'function' ? belongsToMetro : () => true;
  const tourFestivals = (tourResult.festivals || []).map(mapper).filter(Boolean);
  const festivals = mergeFestivalSources(
    cultureFestivals,
    kfesFestivals,
    tourFestivals,
    persisted,
  ).filter((item) => belongs(item, metroKey));
  const sources = [
    cultureFestivals.length ? 'culture' : null,
    kfesFestivals.length ? 'visitkorea' : null,
    tourFestivals.length ? (tourResult.source || 'tour') : null,
    persisted.length ? 'db' : null,
  ].filter(Boolean);
  return {
    festivals,
    tourFestivals,
    source: sources.join('+') || 'none',
  };
}
