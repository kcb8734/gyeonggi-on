/** 부산·경남·울산·세종 data.go.kr + 제주 놀다 OpenAPI. data.go.kr 인증키는 NTS_SERVICE_KEY. */

export const BUILTIN_MUNI_METROS = ['BUSAN', 'GYEONGNAM', 'ULSAN', 'SEJONG', 'JEJU'];

export const MUNICIPAL_CULTURE_DEFAULTS = {
  BUSAN: {
    label: '부산시 축제정보',
    description: 'apis.data.go.kr/6260000/FestivalService/getFestivalKr',
    urls: [
      'https://apis.data.go.kr/6260000/FestivalService/getFestivalKr',
    ],
    pageStyle: 'pageNo',
    timeoutMs: 8000,
  },
  GYEONGNAM: {
    label: '경상남도 문화행사',
    description: 'apis.data.go.kr/6480000/gyeongnamculture/gyeongnamcultureList',
    urls: [
      'https://apis.data.go.kr/6480000/gyeongnamculture/gyeongnamcultureList',
      'http://apis.data.go.kr/6480000/gyeongnamculture/gyeongnamcultureList',
    ],
    pageStyle: 'pageNo',
    timeoutMs: 12000,
  },
  ULSAN: {
    label: '울산광역시 축제',
    description: 'apis.data.go.kr/6310000/ulsanfestival/getUlsanfestivalList',
    urls: [
      'https://apis.data.go.kr/6310000/ulsanfestival/getUlsanfestivalList',
    ],
    pageStyle: 'pageNo',
    timeoutMs: 8000,
  },
  SEJONG: {
    label: '세종특별자치시 축제',
    description: 'apis.data.go.kr/5690000/sjFestival/sj_00000360',
    urls: [
      'https://apis.data.go.kr/5690000/sjFestival/sj_00000360',
    ],
    pageStyle: 'sejong',
    timeoutMs: 8000,
  },
  JEJU: {
    label: '제주특별자치도 전시문화행사',
    description: 'www.jejunolda.com/api/event',
    urls: [
      'https://www.jejunolda.com/api/event/',
      'http://www.jejunolda.com/api/event/',
    ],
    pageStyle: 'jeju',
    timeoutMs: 8000,
    auth: 'none',
  },
};

const REGION_PREFIX = {
  BUSAN: '부산광역시',
  GYEONGNAM: '경상남도',
  ULSAN: '울산광역시',
  SEJONG: '세종특별자치시',
  JEJU: '제주특별자치도',
};

export function dataGoKrServiceKey() {
  return String(
    process.env.DATA_GO_KR_SERVICE_KEY
    || process.env.NTS_SERVICE_KEY
    || '',
  ).trim();
}

export function municipalApiKey(metro) {
  const id = String(metro || '').toUpperCase();
  return String(
    process.env[`${id}_CULTURE_API_KEY`]
    || process.env[`${id}_OPENAPI_KEY`]
    || dataGoKrServiceKey()
    || '',
  ).trim();
}

export function municipalDefaultSpec(metro) {
  return MUNICIPAL_CULTURE_DEFAULTS[String(metro || '').toUpperCase()] || null;
}

export function expandMunicipalOperationUrl(url) {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');
  if (/\/FestivalService$/i.test(trimmed)) return `${trimmed}/getFestivalKr`;
  if (/jejunolda\.com\/api\/event$/i.test(trimmed)) return `${trimmed}/`;
  return trimmed;
}

export function municipalCultureUrls(metro, configuredUrl = '') {
  const spec = municipalDefaultSpec(metro);
  const urls = [];
  const extra = expandMunicipalOperationUrl(configuredUrl);
  if (extra) urls.push(extra);
  for (const url of spec?.urls || []) {
    const next = expandMunicipalOperationUrl(url);
    if (next && !urls.includes(next)) urls.push(next);
  }
  return urls;
}

export function hasMunicipalDefault(metro) {
  return Boolean(municipalDefaultSpec(metro));
}

export function regionAddressPrefix(metro) {
  return REGION_PREFIX[String(metro || '').toUpperCase()] || '';
}

export function municipalAuthNone(metro) {
  return municipalDefaultSpec(metro)?.auth === 'none';
}

export function applyMunicipalPaging(rawUrl, metro, page, size) {
  const next = new URL(rawUrl);
  const spec = municipalDefaultSpec(metro);
  if (spec?.pageStyle === 'sejong') {
    next.searchParams.set('pageIndex', String(page));
    next.searchParams.set('pageUnit', String(size));
    if (!next.searchParams.get('dataTy')) next.searchParams.set('dataTy', 'xml');
  } else if (spec?.pageStyle === 'jeju') {
    next.searchParams.set('page', String(page));
    next.searchParams.set('pageSize', String(size));
  } else {
    next.searchParams.set('pageNo', String(page));
    next.searchParams.set('numOfRows', String(size));
  }
  return next.toString();
}

export function injectServiceKey(rawUrl, key) {
  if (!rawUrl) return '';
  if (!key) return String(rawUrl);
  if (String(rawUrl).includes('{KEY}')) return String(rawUrl).replace('{KEY}', encodeURIComponent(key));
  const next = new URL(rawUrl);
  if (!next.searchParams.get('serviceKey') && !next.searchParams.get('ServiceKey') && !next.searchParams.get('KEY') && !next.searchParams.get('key')) {
    next.searchParams.set('serviceKey', key);
  }
  return next.toString();
}

export function hintMetroFromSource(hint) {
  const value = String(hint || '').toLowerCase();
  if (value === 'busan' || value === 'bsart' || value === 'bsartservice' || value === 'festivalservice' || value === 'getfestivalkr') return 'BUSAN';
  if (value === 'gyeongnam' || value === 'gn' || value === 'gyeongnamculture') return 'GYEONGNAM';
  if (value === 'ulsan' || value === 'ulsanfestival') return 'ULSAN';
  if (value === 'sejong' || value === 'sjfestival') return 'SEJONG';
  if (value === 'jeju' || value === 'jejunolda' || value === 'jejuevent' || value === 'jeju-event') return 'JEJU';
  return '';
}
