import { normalizeMetroId } from './regions';

const DISTRICT_KEYS = ['광산구', '종로구', '동구', '서구', '남구', '북구', '중구'] as const;
const METRO_IDS = new Set([
  'SEOUL', 'BUSAN', 'DAEGU', 'INCHEON', 'GWANGJU', 'DAEJEON', 'ULSAN', 'SEJONG',
  'GYEONGGI', 'GANGWON', 'CHUNGBUK', 'CHUNGNAM', 'JEONBUK', 'JEONNAM', 'GYEONGBUK', 'GYEONGNAM', 'JEJU',
]);
const METRO_HINTS: Array<[string, string]> = [
  ['서울', 'SEOUL'],
  ['부산', 'BUSAN'],
  ['대구', 'DAEGU'],
  ['인천', 'INCHEON'],
  ['광주', 'GWANGJU'],
  ['대전', 'DAEJEON'],
  ['울산', 'ULSAN'],
  ['세종', 'SEJONG'],
  ['경기', 'GYEONGGI'],
  ['강원', 'GANGWON'],
  ['충북', 'CHUNGBUK'],
  ['충청북', 'CHUNGBUK'],
  ['충남', 'CHUNGNAM'],
  ['충청남', 'CHUNGNAM'],
  ['전북', 'JEONBUK'],
  ['전남', 'JEONNAM'],
  ['경북', 'GYEONGBUK'],
  ['경남', 'GYEONGNAM'],
  ['제주', 'JEJU'],
];

export function resolveFallbackKey(
  location?: string | null,
  metro?: string | null,
  title?: string | null,
): string {
  const hay = `${location ?? ''} ${title ?? ''}`;
  for (const district of DISTRICT_KEYS) {
    if (hay.includes(district)) return district;
  }
  const zone = metro ? normalizeMetroId(metro) : '';
  if (zone && METRO_IDS.has(zone)) return zone;
  for (const [token, key] of METRO_HINTS) {
    if (hay.includes(token)) return key;
  }
  return 'default';
}

export function regionalFallbackUri(
  location?: string | null,
  metro?: string | null,
  title?: string | null,
): string {
  return `asset://festival-fallback/${resolveFallbackKey(location, metro, title)}`;
}
