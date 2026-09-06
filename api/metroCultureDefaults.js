/** 부산·경남·울산·세종 data.go.kr 문화/축제 OpenAPI. 인증키는 NTS_SERVICE_KEY 를 쓴다. */

export const BUILTIN_MUNI_METROS = ['BUSAN', 'GYEONGNAM', 'ULSAN', 'SEJONG'];

export const MUNICIPAL_CULTURE_DEFAULTS = {
  BUSAN: {
    label: '부산시 문화예술',
    description: 'apis.data.go.kr/6260000/BsArtService · 폐기 시 FestivalService/getFestivalKr',
    urls: [
      'https://apis.data.go.kr/6260000/BsArtService',
      'https://apis.data.go.kr/6260000/FestivalService/getFestivalKr',
      'https://apis.data.go.kr/6260000/BusanCultureThemeService/getBusanCultureTheme',
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
};

const REGION_PREFIX = {
  BUSAN: '부산광역시',
  GYEONGNAM: '경상남도',
  ULSAN: '울산광역시',
  SEJONG: '세종특별자치시',
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

export function municipalCultureUrls(metro, configuredUrl = '') {
  const spec = municipalDefaultSpec(metro);
  const urls = [];
  const extra = String(configuredUrl || '').trim();
  if (extra) urls.push(extra);
  for (const url of spec?.urls || []) {
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

export function hasMunicipalDefault(metro) {
  return Boolean(municipalDefaultSpec(metro));
}

export function regionAddressPrefix(metro) {
  return REGION_PREFIX[String(metro || '').toUpperCase()] || '';
}

export function applyMunicipalPaging(rawUrl, metro, page, size) {
  const next = new URL(rawUrl);
  const spec = municipalDefaultSpec(metro);
  if (spec?.pageStyle === 'sejong') {
    next.searchParams.set('pageIndex', String(page));
    next.searchParams.set('pageUnit', String(size));
    if (!next.searchParams.get('dataTy')) next.searchParams.set('dataTy', 'xml');
  } else {
    next.searchParams.set('pageNo', String(page));
    next.searchParams.set('numOfRows', String(size));
  }
  return next.toString();
}

export function injectServiceKey(rawUrl, key) {
  if (!rawUrl) return '';
  if (String(rawUrl).includes('{KEY}')) return String(rawUrl).replace('{KEY}', encodeURIComponent(key));
  const next = new URL(rawUrl);
  if (!next.searchParams.get('serviceKey') && !next.searchParams.get('ServiceKey') && !next.searchParams.get('KEY') && !next.searchParams.get('key')) {
    next.searchParams.set('serviceKey', key);
  }
  return next.toString();
}

export function hintMetroFromSource(hint) {
  const value = String(hint || '').toLowerCase();
  if (value === 'busan' || value === 'bsart' || value === 'bsartservice') return 'BUSAN';
  if (value === 'gyeongnam' || value === 'gn' || value === 'gyeongnamculture') return 'GYEONGNAM';
  if (value === 'ulsan' || value === 'ulsanfestival') return 'ULSAN';
  if (value === 'sejong' || value === 'sjfestival') return 'SEJONG';
  return '';
}
