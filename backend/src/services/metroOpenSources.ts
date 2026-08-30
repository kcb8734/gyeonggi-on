import { AREA_CODE_BY_METRO, REGION_LABEL, REGION_META } from '../constants/metroLocalities';

const METRO_IDS = Object.keys(REGION_META);

function envSet(name: string) {
  return Boolean(String(process.env[name] || '').trim());
}

export function catalogOpenSources() {
  const tourKey = envSet('TOUR_API_SERVICE_KEY') || envSet('NTS_SERVICE_KEY');
  const seoulKey = envSet('SEOUL_CULTURE_API_KEY') || envSet('SEOUL_OPENAPI_KEY');
  const ggKey = envSet('GG_CULTURE_API_KEY') || envSet('GGCULTURE_API_KEY') || envSet('GG_OPENAPI_KEY');
  const national = [
    { id: 'tour', kind: 'tour', metro: 'ALL', label: '한국관광공사 TourAPI 4.0', targetApi: 'searchFestival2', description: 'KorService2 searchFestival2 전국', envHint: 'TOUR_API_SERVICE_KEY', keyConfigured: tourKey, collectable: tourKey, syncQuery: { source: 'tour', areaCode: 'all' } },
    { id: 'seoul', kind: 'muni', metro: 'SEOUL', label: '서울시 문화행사', targetApi: 'culturalEventInfo', description: 'openapi.seoul.go.kr culturalEventInfo', envHint: 'SEOUL_CULTURE_API_KEY', keyConfigured: seoulKey, collectable: true, syncQuery: { source: 'seoul' } },
    { id: 'ggc', kind: 'muni', metro: 'GYEONGGI', label: '경기도 문화행사', targetApi: 'GGCULTUREVENTSTUS', description: 'openapi.gg.go.kr GGCULTUREVENTSTUS', envHint: 'GG_CULTURE_API_KEY', keyConfigured: ggKey, collectable: ggKey, syncQuery: { source: 'ggc' } },
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
    count: 0,
  }));
  const muniMetros = METRO_IDS.filter((metro) => metro !== 'SEOUL' && metro !== 'GYEONGGI').map((metro) => {
    const urlEnv = `${metro}_CULTURE_API_URL`;
    const keyEnv = `${metro}_CULTURE_API_KEY`;
    const ready = envSet(urlEnv) && envSet(keyEnv);
    return {
      id: `muni-${metro}`,
      kind: 'muni-slot',
      metro,
      label: `${REGION_LABEL[metro]} 지자체 OpenAPI`,
      targetApi: `${metro}_CULTURE`,
      description: ready ? `${urlEnv} 로 수집` : `${urlEnv} · ${keyEnv} 를 넣으면 수집됩니다`,
      envHint: `${urlEnv}, ${keyEnv}`,
      keyConfigured: envSet(keyEnv),
      collectable: ready,
      syncQuery: { source: 'muni', metro },
      count: 0,
    };
  });
  return { national, tourMetros, muniMetros };
}

export function decorateOpenSources(
  catalog: ReturnType<typeof catalogOpenSources>,
  stats: { sourceCounts?: Array<{ source: string; count: number }>; sourceMetroCounts?: Array<{ source: string; metro: string; count: number }> } = {},
) {
  const bySource = Object.fromEntries((stats.sourceCounts || []).map((row) => [row.source, Number(row.count) || 0]));
  const byPair = Object.fromEntries((stats.sourceMetroCounts || []).map((row) => [`${row.source}:${row.metro}`, Number(row.count) || 0]));
  const decorate = <T extends { id: string; kind: string; metro?: string }>(row: T) => {
    let count = 0;
    if (row.id === 'seoul') count = bySource.seoul || 0;
    else if (row.id === 'ggc') count = bySource.ggc || 0;
    else if (row.id === 'tour') count = bySource.tour || 0;
    else if (row.kind === 'tour-metro') count = byPair[`tour:${row.metro}`] || 0;
    else if (row.kind === 'muni-slot') count = byPair[`muni:${row.metro}`] || 0;
    return { ...row, count };
  };
  return {
    national: catalog.national.map(decorate),
    tourMetros: catalog.tourMetros.map(decorate),
    muniMetros: catalog.muniMetros.map(decorate),
  };
}
