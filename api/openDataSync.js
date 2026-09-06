import { catalogOpenSources, decorateOpenSources, municipalSlot } from './metroOpenSources.js';
import { syncGgCultureEvents } from './ggCultureSync.js';
import { syncIfacCultureEvents } from './ifacCultureSync.js';
import { syncSeoulCultureEvents } from './seoulCultureSync.js';
import { syncTourMetroEvents } from './metroTourSync.js';
import { syncMunicipalCultureEvents } from './metroCultureGeneric.js';
import { syncOpenCultureEvents } from './cultureOpenSync.js';
import { BUILTIN_MUNI_METROS, hintMetroFromSource } from './metroCultureDefaults.js';
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
  const rawMetro = String(query.metro || '').trim();
  const metro = rawMetro ? normalizeMetroId(rawMetro) : '';
  if (hint === 'tour' || hint === 'tourapi' || hint === 'searchfestival2') {
    return syncTourMetroEvents(query);
  }
  if (hint === 'seoul' || hint === 'culturaleventinfo') {
    return syncSeoulCultureEvents({ pageSize: 80, maxPages: 1 });
  }
  if (hint === 'gg' || hint === 'ggc' || hint === 'ggculture') {
    return syncGgCultureEvents({ pageSize: 80, maxPages: 1 });
  }
  if (hint === 'ifac' || hint === 'incheon') {
    return syncIfacCultureEvents({ pageSize: 80, maxPages: 1 });
  }
  const builtinMetro = hintMetroFromSource(hint);
  if (builtinMetro) return syncMunicipalCultureEvents(builtinMetro, { pageSize: 40 });
  if (hint === 'muni' || hint === 'municipal' || hint === 'local' || hint === 'metro4') {
    if (metro === 'SEOUL') return syncSeoulCultureEvents({ pageSize: 80, maxPages: 1 });
    if (metro === 'GYEONGGI') return syncGgCultureEvents({ pageSize: 80, maxPages: 1 });
    if (metro === 'INCHEON') return syncIfacCultureEvents({ pageSize: 80, maxPages: 1 });
    if (metro && metro !== 'ALL') return syncMunicipalCultureEvents(metro, { pageSize: 40 });
    const zones = BUILTIN_MUNI_METROS.filter((id) => municipalSlot(id).ready);
    const results = await Promise.all(zones.map((id) => syncMunicipalCultureEvents(id, { pageSize: 40 })));
    const fetched = results.reduce((sum, row) => sum + Number(row.fetched || 0), 0);
    const upserted = results.reduce((sum, row) => sum + Number(row.upserted || 0), 0);
    return {
      success: results.some((row) => row.success),
      source: 'muni',
      sourceLabel: '부산·경남·울산·세종 지자체 OpenAPI',
      targetApi: results.map((row) => row.targetApi).filter(Boolean).join('+'),
      fetched,
      upserted,
      skipped: results.reduce((sum, row) => sum + Number(row.skipped || 0), 0),
      persisted: results.some((row) => row.persisted),
      failed: results.reduce((sum, row) => sum + Number(row.failed || 0), 0),
      sources: results,
      message: results.map((row) => row.message).filter(Boolean).join(' '),
    };
  }
  return syncOpenCultureEvents(query);
}

export async function syncPayloadWithLiveCategories(result) {
  if (!result || result.categories?.length) return result;
  const live = await listFestivalCategoryCounts();
  if (live.length) result.categories = live;
  return result;
}
