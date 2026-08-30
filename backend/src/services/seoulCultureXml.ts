/** 서울시 문화행사(culturalEventInfo) XML 파서. 네트워크·DB 없이 순수 변환만 한다. */

const TAGS = [
  'CODENAME',
  'GUNAME',
  'TITLE',
  'DATE',
  'PLACE',
  'ORG_NAME',
  'USE_TRGT',
  'USE_FEE',
  'INQUIRY',
  'PLAYER',
  'PROGRAM',
  'ETC_DESC',
  'ORG_LINK',
  'MAIN_IMG',
  'RGSTDATE',
  'TICKET',
  'STRTDATE',
  'END_DATE',
  'THEMECODE',
  'LOT',
  'LAT',
  'IS_FREE',
  'HMPG_ADDR',
  'PRO_TIME',
] as const;

export type SeoulCultureTag = (typeof TAGS)[number];
export type SeoulCultureRow = Record<SeoulCultureTag, string>;

export interface PersistableSeoulFestival {
  contentId: string;
  title: string;
  category: string;
  eventStartDate: string;
  eventEndDate: string;
  firstImage: string;
  tel: string;
  overview: string;
  address: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  mapY: number | null;
  mapX: number | null;
  homepageUrl: string;
  detailUrl: string;
  eventTimeInfo: string;
  feeInfo: string;
  isFree: string;
  district: string;
  metro: 'SEOUL';
  regionalZone: 'SEOUL';
  source: 'seoul';
}

function unescapeXml(value: string) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function tagValue(block: string, tag: string) {
  if (new RegExp(`<${tag}\\s*/>`, 'i').test(block)) return '';
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? unescapeXml(match[1]) : '';
}

export function seoulDate(value: string) {
  const text = String(value || '').trim();
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const digits = text.replace(/\D/g, '');
  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return '';
}

export function seoulDateRange(dateField: string, start: string, end: string) {
  const parts = String(dateField || '').split('~').map((part) => seoulDate(part));
  const begin = seoulDate(start) || parts[0] || '';
  const finish = seoulDate(end) || parts[1] || parts[0] || begin;
  return { start: begin, end: finish };
}

export function seoulFeeLabel(useFee: string, isFree: string) {
  const fee = String(useFee || '').trim();
  const free = String(isFree || '').trim();
  if (fee) return fee;
  if (free === '무료' || free === '유료') return free;
  return fee;
}

export function firstTel(value: string) {
  const text = String(value || '').trim();
  const match = text.match(/0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/);
  return (match ? match[0] : text).replace(/\s+/g, ' ').slice(0, 50);
}

export function seoulCoord(lat: string, lot: string) {
  const latitude = Number(lat);
  const longitude = Number(lot);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return { lat: null, lng: null };
  if (latitude < 33 || latitude > 39 || longitude < 124 || longitude > 132) return { lat: null, lng: null };
  return { lat: latitude, lng: longitude };
}

export function extractHttpUrl(value: string) {
  const text = String(value || '').trim();
  const match = text.match(/https?:\/\/\S+/i);
  return match ? match[0].replace(/[)\].,]+$/, '') : '';
}

export function contentIdFromRow(row: Partial<SeoulCultureRow>) {
  const home = String(row.HMPG_ADDR || '');
  const cult = home.match(/cultcode=(\d+)/i);
  if (cult) return `sel-${cult[1]}`.slice(0, 40);
  const org = String(row.ORG_LINK || '').match(/goods\/(\d+)/i);
  if (org) return `sel-${org[1]}`.slice(0, 40);
  const seed = `${row.TITLE || ''}|${row.STRTDATE || row.DATE || ''}|${row.PLACE || ''}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `sel-${(hash >>> 0).toString(16).padStart(8, '0')}`.slice(0, 40);
}

export function parseSeoulCultureXml(xml: string) {
  const text = String(xml || '');
  const resultBlock = text.match(/<RESULT>[\s\S]*?<\/RESULT>/i);
  const code = resultBlock ? tagValue(resultBlock[0], 'CODE') : '';
  const message = resultBlock ? tagValue(resultBlock[0], 'MESSAGE') : '';
  if (code && !/^INFO-000$/i.test(code)) {
    return { ok: false, code, message: message || '서울시 문화행사 API 오류', total: 0, rows: [] as SeoulCultureRow[] };
  }
  const total = Number(tagValue(text, 'list_total_count') || 0);
  const rows: SeoulCultureRow[] = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
  let match = rowRe.exec(text);
  while (match) {
    const block = match[1];
    const row = {} as SeoulCultureRow;
    for (const tag of TAGS) row[tag] = tagValue(block, tag);
    if (row.TITLE && (row.STRTDATE || row.END_DATE || row.DATE)) rows.push(row);
    match = rowRe.exec(text);
  }
  return {
    ok: true,
    code: code || 'INFO-000',
    message: message || '정상 처리되었습니다',
    total: total || rows.length,
    rows,
  };
}

export function countCategories(rows: Array<{ CODENAME?: string; category?: string }>) {
  const counts = new Map<string, number>();
  for (const row of rows || []) {
    const name = String(row.CODENAME || row.category || '기타').trim() || '기타';
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
}

export function mergeCategoryCounts(...lists: Array<Array<{ name: string; count: number }> | undefined>) {
  const counts = new Map<string, number>();
  for (const list of lists) {
    for (const row of list || []) {
      const name = String(row.name || '기타').trim() || '기타';
      counts.set(name, (counts.get(name) || 0) + Number(row.count || 0));
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
}

export function toPersistableFestival(row: SeoulCultureRow): PersistableSeoulFestival | null {
  const dates = seoulDateRange(row.DATE, row.STRTDATE, row.END_DATE);
  const title = String(row.TITLE || '').trim();
  if (!title || !dates.start) return null;
  const detailUrl = extractHttpUrl(row.HMPG_ADDR);
  const homepage = extractHttpUrl(row.ORG_LINK);
  const place = String(row.PLACE || '').trim();
  const guname = String(row.GUNAME || '').trim();
  const fee = seoulFeeLabel(row.USE_FEE, row.IS_FREE);
  const timeInfo = String(row.PRO_TIME || '').trim();
  const coords = seoulCoord(row.LAT, row.LOT);
  const description = [
    timeInfo ? `시간 ${timeInfo}` : '',
    fee ? `요금 ${fee}` : '',
    String(row.IS_FREE || '').trim() && fee !== row.IS_FREE ? `구분 ${row.IS_FREE}` : '',
    String(row.USE_TRGT || '').trim() ? `대상 ${String(row.USE_TRGT).trim()}` : '',
    String(row.PROGRAM || '').trim() ? String(row.PROGRAM).trim() : '',
    detailUrl ? `상세 ${detailUrl}` : '',
    homepage ? `예매/홈페이지 ${homepage}` : '',
  ].filter(Boolean).join('\n');
  return {
    contentId: contentIdFromRow(row),
    title,
    category: String(row.CODENAME || '문화/예술').trim() || '문화/예술',
    eventStartDate: dates.start,
    eventEndDate: dates.end,
    firstImage: extractHttpUrl(row.MAIN_IMG) || String(row.MAIN_IMG || '').trim(),
    tel: firstTel(row.INQUIRY),
    overview: description,
    address: `서울 ${guname} ${place}`.trim(),
    location_name: place || (guname ? `서울 ${guname}` : '서울'),
    latitude: coords.lat,
    longitude: coords.lng,
    mapY: coords.lat,
    mapX: coords.lng,
    homepageUrl: homepage,
    detailUrl,
    eventTimeInfo: timeInfo,
    feeInfo: fee,
    isFree: String(row.IS_FREE || '').trim(),
    district: guname,
    metro: 'SEOUL',
    regionalZone: 'SEOUL',
    source: 'seoul',
  };
}
