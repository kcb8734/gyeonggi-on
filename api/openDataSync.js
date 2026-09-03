import { catalogOpenSources, decorateOpenSources } from './metroOpenSources.js';
import { syncGgCultureEvents } from './ggCultureSync.js';
import { syncIfacCultureEvents } from './ifacCultureSync.js';
import { syncSeoulCultureEvents } from './seoulCultureSync.js';
import { syncTourMetroEvents } from './metroTourSync.js';
import { syncMunicipalCultureEvents } from './metroCultureGeneric.js';
import { syncOpenCultureEvents } from './cultureOpenSync.js';
import {
  listFestivalCategoryCounts,
  listFestivalSourceCounts,
  listFestivalSourceMetroCounts,
  listTourSyncLogs,
} from './festivalDbSync.js';
import { normalizeMetroId } from './metroLocalities.js';

export async function loadOpenSourceBoard() {
  const [sourceCounts, sourceMetroCounts, logs] = await Promise.all([
    listFestivalSourceCounts(),
    listFestivalSourceMetroCounts(),
    listTourSyncLogs(24),
  ]);
  return decorateOpenSources(catalogOpenSources(), { sourceCounts, sourceMetroCounts, logs });
}

function syncBudget(query = {}) {
  const pageSize = Number(query.pageSize || query.numOfRows || 40);
  return {
    pageSize: Math.min(80, Math.max(10, Number.isFinite(pageSize) ? pageSize : 40)),
    maxPages: 1,
  };
}

export async function dispatchOpenDataSync(query = {}) {
  const hint = String(query.source || query.api || '').toLowerCase();
  const metro = normalizeMetroId(query.metro);
  const budget = syncBudget(query);
  if (hint === 'tour' || hint === 'tourapi' || hint === 'searchfestival2') {
    return syncTourMetroEvents(query);
  }
  if (hint === 'seoul' || hint === 'culturaleventinfo') {
    return syncSeoulCultureEvents(budget);
  }
  if (hint === 'gg' || hint === 'ggc' || hint === 'ggculture') {
    return syncGgCultureEvents(budget);
  }
  if (hint === 'ifac' || hint === 'incheon') {
    return syncIfacCultureEvents(budget);
  }
  if (hint === 'muni' || hint === 'municipal' || hint === 'local') {
    if (metro === 'SEOUL') return syncSeoulCultureEvents(budget);
    if (metro === 'GYEONGGI') return syncGgCultureEvents(budget);
    if (metro === 'INCHEON') return syncIfacCultureEvents(budget);
    return syncMunicipalCultureEvents(metro);
  }
  return syncOpenCultureEvents(query);
}

export async function syncPayloadWithLiveCategories(result) {
  if (!result || result.categories?.length) return result;
  const live = await listFestivalCategoryCounts();
  if (live.length) result.categories = live;
  return result;
}
