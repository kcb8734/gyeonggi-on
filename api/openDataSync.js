import { catalogOpenSources, decorateOpenSources, municipalSlot } from './metroOpenSources.js';
import { syncGgCultureEvents } from './ggCultureSync.js';
import { syncIfacCultureEvents } from './ifacCultureSync.js';
import { syncSeoulCultureEvents } from './seoulCultureSync.js';
import { syncTourMetroEvents } from './metroTourSync.js';
import { syncMunicipalCultureEvents } from './metroCultureGeneric.js';
import { syncOpenCultureEvents } from './cultureOpenSync.js';
import { syncKfesCalendar } from './kfesCalendarSync.js';
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
  if (hint === 'kfes' || hint === 'visitkorea' || hint === 'calendar' || hint === 'festivalcalendar' || hint.includes('구석구석')) {
    return syncKfesCalendar(query);
  }
  const builtinMetro = hintMetroFromSource(hint);
  if (builtinMetro) return syncMunicipalCultureEvents(builtinMetro, { pageSize: 40 });
  if (hint === 'region' || hint === 'metro-api' || hint === 'metroapi') {
    return syncRegionOpenData(metro, query);
  }
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
      sourceLabel: '부산·경남·울산·세종·제주 지자체 OpenAPI',
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

function syncMuniForMetro(metro, options = {}) {
  if (metro === 'SEOUL') return syncSeoulCultureEvents({ pageSize: 80, maxPages: 1 });
  if (metro === 'GYEONGGI') return syncGgCultureEvents({ pageSize: 80, maxPages: 1 });
  if (metro === 'INCHEON') return syncIfacCultureEvents({ pageSize: 80, maxPages: 1 });
  if (metro && metro !== 'ALL' && municipalSlot(metro).ready) {
    return syncMunicipalCultureEvents(metro, { pageSize: options.pageSize || 40 });
  }
  return null;
}

export async function syncRegionOpenData(metro, query = {}) {
  const zone = normalizeMetroId(metro);
  if (!zone || zone === 'ALL') {
    return {
      success: false,
      source: 'region',
      sourceLabel: '광역 API',
      fetched: 0,
      upserted: 0,
      message: '권역(metro)을 지정하면 해당 광역 API를 즉시 수집합니다.',
    };
  }
  const jobs = [syncTourMetroEvents({ ...query, metro: zone })];
  const muniJob = syncMuniForMetro(zone, query);
  if (muniJob) jobs.push(muniJob);
  const results = (await Promise.all(jobs)).filter(Boolean);
  const fetched = results.reduce((sum, row) => sum + Number(row?.fetched || 0), 0);
  const upserted = results.reduce((sum, row) => sum + Number(row?.upserted || 0), 0);
  const categories = results.flatMap((row) => row?.categories || []);
  const uniqueCategories = [];
  const seen = new Set();
  for (const row of categories) {
    const name = String(row?.name || '');
    if (!name || seen.has(name)) continue;
    seen.add(name);
    uniqueCategories.push(row);
  }
  return {
    success: results.some((row) => row?.success),
    source: 'region',
    sourceLabel: `${zone} 광역 API`,
    targetApi: results.map((row) => row?.targetApi).filter(Boolean).join('+'),
    metro: zone,
    fetched,
    upserted,
    skipped: results.reduce((sum, row) => sum + Number(row?.skipped || 0), 0),
    persisted: results.some((row) => row?.persisted),
    failed: results.reduce((sum, row) => sum + Number(row?.failed || 0), 0),
    categories: uniqueCategories,
    sources: results,
    message: results.map((row) => row?.message).filter(Boolean).join(' ') || `${zone} 광역 API 수집을 마쳤습니다.`,
  };
}

export async function syncPayloadWithLiveCategories(result) {
  if (!result || result.categories?.length) return result;
  const live = await listFestivalCategoryCounts();
  if (live.length) result.categories = live;
  return result;
}
