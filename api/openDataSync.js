import { catalogOpenSources, decorateOpenSources } from './metroOpenSources.js';
import { syncGgCultureEvents } from './ggCultureSync.js';
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

export async function dispatchOpenDataSync(query = {}) {
  const hint = String(query.source || query.api || '').toLowerCase();
  const metro = normalizeMetroId(query.metro);
  if (hint === 'tour' || hint === 'tourapi' || hint === 'searchfestival2') {
    return syncTourMetroEvents(query);
  }
  if (hint === 'seoul' || hint === 'culturaleventinfo') {
    return syncSeoulCultureEvents({ pageSize: 80, maxPages: 1 });
  }
  if (hint === 'gg' || hint === 'ggc' || hint === 'ggculture') {
    return syncGgCultureEvents({ pageSize: 80, maxPages: 1 });
  }
  if (hint === 'muni' || hint === 'municipal' || hint === 'local') {
    if (metro === 'SEOUL') return syncSeoulCultureEvents({ pageSize: 80, maxPages: 1 });
    if (metro === 'GYEONGGI') return syncGgCultureEvents({ pageSize: 80, maxPages: 1 });
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
