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

const HTTPS_STOCK: Record<string, string> = {
  SEOUL: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80',
  BUSAN: 'https://images.unsplash.com/photo-1467810563316-b554652e1da4?w=800&q=80',
  DAEGU: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
  INCHEON: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80',
  GWANGJU: 'https://images.unsplash.com/photo-1467260201071-6e2ed80abd56?w=800&q=80',
  DAEJEON: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=80',
  ULSAN: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  SEJONG: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80',
  GYEONGGI: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
  GANGWON: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  CHUNGBUK: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80',
  CHUNGNAM: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80',
  JEONBUK: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80',
  JEONNAM: 'https://images.unsplash.com/photo-1467810563316-b554652e1da4?w=800&q=80',
  GYEONGBUK: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&q=80',
  GYEONGNAM: 'https://images.unsplash.com/photo-1528360983277-427c9a0e30ef?w=800&q=80',
  JEJU: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
  default: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
  서구: 'https://images.unsplash.com/photo-1467260201071-6e2ed80abd56?w=800&q=80',
  동구: 'https://images.unsplash.com/photo-1467260201071-6e2ed80abd56?w=800&q=80',
  북구: 'https://images.unsplash.com/photo-1467260201071-6e2ed80abd56?w=800&q=80',
  남구: 'https://images.unsplash.com/photo-1467260201071-6e2ed80abd56?w=800&q=80',
  광산구: 'https://images.unsplash.com/photo-1467260201071-6e2ed80abd56?w=800&q=80',
  중구: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80',
  종로구: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80',
};

/** Image가 열 수 있는 https URL. asset:// 는 브라우저에서 항상 404다. */
export function regionalFallbackUri(
  location?: string | null,
  metro?: string | null,
  title?: string | null,
): string {
  const key = resolveFallbackKey(location, metro, title);
  return HTTPS_STOCK[key] || HTTPS_STOCK.default;
}
