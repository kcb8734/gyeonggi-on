import { AREA_CODE_BY_METRO, REGION_LABEL, REGION_META } from '../constants/metroLocalities';

const METRO_IDS = Object.keys(REGION_META);
const BUILTIN_MUNI_METROS = new Set(['BUSAN', 'GYEONGNAM', 'ULSAN', 'SEJONG', 'JEJU']);
const BUILTIN_MUNI_LABEL: Record<string, string> = {
  BUSAN: '부산시 축제정보 OpenAPI',
  GYEONGNAM: '경상남도 문화행사 OpenAPI',
  ULSAN: '울산광역시 축제 OpenAPI',
  SEJONG: '세종특별자치시 축제 OpenAPI',
  JEJU: '제주특별자치도 전시문화행사 OpenAPI',
};
const BUILTIN_MUNI_DESC: Record<string, string> = {
  BUSAN: 'apis.data.go.kr/6260000/FestivalService/getFestivalKr',
  GYEONGNAM: 'apis.data.go.kr/6480000/gyeongnamculture/gyeongnamcultureList',
  ULSAN: 'apis.data.go.kr/6310000/ulsanfestival/getUlsanfestivalList',
  SEJONG: 'apis.data.go.kr/5690000/sjFestival/sj_00000360',
  JEJU: 'www.jejunolda.com/api/event (인증 없음)',
};
const BUILTIN_MUNI_NO_KEY = new Set(['JEJU']);

function envSet(name: string) {
  return Boolean(String(process.env[name] || '').trim());
}

export function catalogOpenSources() {
  const tourKey = envSet('TOUR_API_SERVICE_KEY') || envSet('NTS_SERVICE_KEY');
  const seoulKey = envSet('SEOUL_CULTURE_API_KEY') || envSet('SEOUL_OPENAPI_KEY');
  const ggKey = envSet('GG_CULTURE_API_KEY') || envSet('GGCULTURE_API_KEY') || envSet('GG_OPENAPI_KEY');
  const ifacKey = envSet('INCHEON_API_KEY') || envSet('IFAC_API_KEY') || envSet('INCHEON_CULTURE_API_KEY');
  const national = [
    { id: 'tour', kind: 'tour', metro: 'ALL', label: '한국관광공사 TourAPI 4.0', targetApi: 'searchFestival2', description: 'KorService2 searchFestival2 전국', envHint: 'TOUR_API_SERVICE_KEY', keyConfigured: tourKey, collectable: tourKey, syncQuery: { source: 'tour', areaCode: 'all' } },
    { id: 'seoul', kind: 'muni', metro: 'SEOUL', label: '서울시 문화행사', targetApi: 'culturalEventInfo', description: 'openapi.seoul.go.kr culturalEventInfo', envHint: 'SEOUL_CULTURE_API_KEY', keyConfigured: seoulKey, collectable: true, syncQuery: { source: 'seoul' } },
    { id: 'ggc', kind: 'muni', metro: 'GYEONGGI', label: '경기도 문화행사', targetApi: 'GGCULTUREVENTSTUS', description: 'openapi.gg.go.kr GGCULTUREVENTSTUS', envHint: 'GG_CULTURE_API_KEY', keyConfigured: ggKey, collectable: ggKey, syncQuery: { source: 'ggc' } },
    { id: 'ifac', kind: 'muni', metro: 'INCHEON', label: '인천문화재단 문화예술행사', targetApi: 'ifac-culture', description: 'ifac.or.kr openAPI/real/search.do svid=culture', envHint: 'INCHEON_API_KEY', keyConfigured: ifacKey, collectable: ifacKey, syncQuery: { source: 'ifac' } },
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
  const muniMetros = METRO_IDS.filter((metro) => metro !== 'SEOUL' && metro !== 'GYEONGGI' && metro !== 'INCHEON').map((metro) => {
    const urlEnv = `${metro}_CULTURE_API_URL`;
    const keyEnv = `${metro}_CULTURE_API_KEY`;
    const builtin = BUILTIN_MUNI_METROS.has(metro);
    const noKey = BUILTIN_MUNI_NO_KEY.has(metro);
    const keyConfigured = envSet(keyEnv) || noKey || (builtin && (envSet('NTS_SERVICE_KEY') || envSet('DATA_GO_KR_SERVICE_KEY')));
    const ready = (envSet(urlEnv) && envSet(keyEnv)) || (builtin && (noKey || keyConfigured));
    return {
      id: `muni-${metro}`,
      kind: 'muni-slot',
      metro,
      label: BUILTIN_MUNI_LABEL[metro] || `${REGION_LABEL[metro]} 지자체 OpenAPI`,
      targetApi: `${metro}_CULTURE`,
      description: BUILTIN_MUNI_DESC[metro] || (ready ? `${urlEnv} 로 수집` : `${urlEnv} · ${keyEnv} 를 넣으면 수집됩니다`),
      envHint: noKey ? '인증 없음' : (builtin ? 'NTS_SERVICE_KEY' : `${urlEnv}, ${keyEnv}`),
      keyConfigured,
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
    else if (row.id === 'ifac') count = bySource.ifac || 0;
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
