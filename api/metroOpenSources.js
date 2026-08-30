import { AREA_CODE_BY_METRO, REGION_LABEL, REGION_META } from './metroLocalities.js';
import { tourServiceKey } from './tourLive.js';

export const METRO_IDS = Object.keys(REGION_META);

function envFirst(names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return { name, set: true };
  }
  return { name: names[0], set: false };
}

export function municipalEnvNames(metro) {
  const id = String(metro || '').toUpperCase();
  return {
    key: [`${id}_CULTURE_API_KEY`, `${id}_OPENAPI_KEY`],
    url: [`${id}_CULTURE_API_URL`, `${id}_OPENAPI_URL`],
  };
}

export function hasTourApiKey() {
  return Boolean(tourServiceKey());
}

export function hasSeoulApiKey() {
  return Boolean(String(process.env.SEOUL_CULTURE_API_KEY || process.env.SEOUL_OPENAPI_KEY || '').trim())
    || !process.env.NODE_TEST_CONTEXT;
}

export function hasGgApiKey() {
  return Boolean(String(
    process.env.GG_CULTURE_API_KEY
    || process.env.GGCULTURE_API_KEY
    || process.env.GG_OPENAPI_KEY
    || '',
  ).trim());
}

export function hasIfacApiKey() {
  return Boolean(String(
    process.env.INCHEON_API_KEY
    || process.env.IFAC_API_KEY
    || process.env.INCHEON_CULTURE_API_KEY
    || '',
  ).trim());
}

export function municipalSlot(metro) {
  const names = municipalEnvNames(metro);
  const key = envFirst(names.key);
  const url = envFirst(names.url);
  return {
    metro,
    keyEnv: key.name,
    urlEnv: url.name,
    keyConfigured: key.set,
    urlConfigured: url.set,
    ready: key.set && url.set,
  };
}

/** 관리자에서 확인·수집하는 공공데이터 소스 목록. */
export function catalogOpenSources() {
  const tourKey = hasTourApiKey();
  const seoulKey = Boolean(String(process.env.SEOUL_CULTURE_API_KEY || process.env.SEOUL_OPENAPI_KEY || '').trim());
  const ggKey = hasGgApiKey();
  const ifacKey = hasIfacApiKey();
  const national = [
    {
      id: 'tour',
      kind: 'tour',
      metro: 'ALL',
      label: '한국관광공사 TourAPI 4.0',
      targetApi: 'searchFestival2',
      description: 'KorService2 searchFestival2 전국',
      envHint: 'TOUR_API_SERVICE_KEY',
      keyConfigured: tourKey,
      collectable: tourKey,
      syncQuery: { source: 'tour', areaCode: 'all' },
    },
    {
      id: 'seoul',
      kind: 'muni',
      metro: 'SEOUL',
      label: '서울시 문화행사',
      targetApi: 'culturalEventInfo',
      description: 'openapi.seoul.go.kr culturalEventInfo',
      envHint: 'SEOUL_CULTURE_API_KEY',
      keyConfigured: seoulKey,
      collectable: true,
      syncQuery: { source: 'seoul' },
    },
    {
      id: 'ggc',
      kind: 'muni',
      metro: 'GYEONGGI',
      label: '경기도 문화행사',
      targetApi: 'GGCULTUREVENTSTUS',
      description: 'openapi.gg.go.kr GGCULTUREVENTSTUS',
      envHint: 'GG_CULTURE_API_KEY',
      keyConfigured: ggKey,
      collectable: ggKey,
      syncQuery: { source: 'ggc' },
    },
    {
      id: 'ifac',
      kind: 'muni',
      metro: 'INCHEON',
      label: '인천문화재단 문화예술행사',
      targetApi: 'ifac-culture',
      description: 'ifac.or.kr openAPI/real/search.do svid=culture',
      envHint: 'INCHEON_API_KEY',
      keyConfigured: ifacKey,
      collectable: ifacKey,
      syncQuery: { source: 'ifac' },
    },
  ];

  const tourMetros = METRO_IDS.map((metro) => ({
    id: `tour-${metro}`,
    kind: 'tour-metro',
    metro,
    label: `${REGION_LABEL[metro]} TourAPI`,
    targetApi: 'searchFestival2',
    description: `areaCode ${AREA_CODE_BY_METRO[metro]} · ${metro}`,
    envHint: 'TOUR_API_SERVICE_KEY',
    keyConfigured: tourKey,
    collectable: tourKey,
    syncQuery: { source: 'tour', metro },
  }));

  const muniMetros = METRO_IDS.filter((metro) => metro !== 'SEOUL' && metro !== 'GYEONGGI' && metro !== 'INCHEON').map((metro) => {
    const slot = municipalSlot(metro);
    return {
      id: `muni-${metro}`,
      kind: 'muni-slot',
      metro,
      label: `${REGION_LABEL[metro]} 지자체 OpenAPI`,
      targetApi: `${metro}_CULTURE`,
      description: slot.ready
        ? `${slot.urlEnv} 로 수집`
        : `${slot.urlEnv} · ${slot.keyEnv} 를 넣으면 수집됩니다`,
      envHint: `${slot.urlEnv}, ${slot.keyEnv}`,
      keyConfigured: slot.keyConfigured,
      urlConfigured: slot.urlConfigured,
      collectable: slot.ready,
      syncQuery: { source: 'muni', metro },
    };
  });

  return { national, tourMetros, muniMetros, all: [...national, ...tourMetros, ...muniMetros] };
}

export function decorateOpenSources(catalog, stats = {}) {
  const sourceCounts = stats.sourceCounts || [];
  const sourceMetroCounts = stats.sourceMetroCounts || [];
  const logs = stats.logs || [];
  const bySource = Object.fromEntries(sourceCounts.map((row) => [row.source, Number(row.count) || 0]));
  const byPair = Object.fromEntries(
    sourceMetroCounts.map((row) => [`${row.source}:${row.metro}`, Number(row.count) || 0]),
  );
  const latest = {};
  for (const log of logs) {
    const id = matchLogToSource(log.target_api);
    if (id && !latest[id]) latest[id] = log;
    const api = String(log.target_api || '');
    if (!latest[api]) latest[api] = log;
  }
  const decorate = (row) => {
    let count = 0;
    if (row.id === 'seoul') count = bySource.seoul || 0;
    else if (row.id === 'ggc') count = bySource.ggc || 0;
    else if (row.id === 'ifac') count = bySource.ifac || 0;
    else if (row.id === 'tour') count = bySource.tour || 0;
    else if (row.kind === 'tour-metro') count = byPair[`tour:${row.metro}`] || 0;
    else if (row.kind === 'muni-slot') count = byPair[`muni:${row.metro}`] || 0;
    const log = latest[row.id] || latest[row.targetApi];
    return {
      ...row,
      count,
      lastSync: log?.ran_at || null,
      lastFetched: log ? Number(log.fetched) : null,
      lastStatus: log?.status || (row.collectable ? '대기' : '키없음'),
    };
  };
  return {
    national: (catalog.national || []).map(decorate),
    tourMetros: (catalog.tourMetros || []).map(decorate),
    muniMetros: (catalog.muniMetros || []).map(decorate),
  };
}

export async function listOpenSources(stats) {
  return decorateOpenSources(catalogOpenSources(), stats || {});
}

export function matchLogToSource(targetApi, sourceIdHint) {
  const api = String(targetApi || '');
  if (sourceIdHint) return sourceIdHint;
  if (/culturalEventInfo/i.test(api)) return 'seoul';
  if (/GGCULTURE/i.test(api)) return 'ggc';
  if (/ifac/i.test(api)) return 'ifac';
  const cultureMetro = METRO_IDS.find((id) => new RegExp(`^${id}_CULTURE$`, 'i').test(api));
  if (cultureMetro) return `muni-${cultureMetro}`;
  const tourMetro = METRO_IDS.find((id) => new RegExp(`searchFestival2:${id}$`, 'i').test(api));
  if (tourMetro) return `tour-${tourMetro}`;
  if (/searchFestival2/i.test(api)) return 'tour';
  return '';
}
