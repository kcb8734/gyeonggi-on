/** 인천문화재단 문화예술행사 OpenAPI XML 파서. 네트워크·DB 없이 순수 변환만 한다. */

const TAGS = [
  'idx',
  'title',
  'link',
  'category',
  'sdate',
  'edate',
  'place',
  'placeSido',
  'placeGugun',
  'management',
  'feeCase',
  'fee_case',
  'fee',
  'tel',
  'homepage',
  'poster',
  'posterThumb',
  'description',
  'reserveInfo',
  'reserveURL',
  'pubDate',
];

function unescapeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>?/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function tagValue(block, tag) {
  if (new RegExp(`<${tag}\\s*/>`, 'i').test(block)) return '';
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? unescapeXml(match[1]) : '';
}

export function ymdDash(value) {
  const text = String(value || '').trim();
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const digits = text.replace(/\D/g, '');
  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return '';
}

export function extractHttpUrl(value) {
  const text = String(value || '')
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>?/g, '')
    .trim();
  const match = text.match(/https?:\/\/\S+/i);
  return match ? match[0].replace(/[)\].,>]+$/, '') : '';
}

export function plainText(value) {
  return unescapeXml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 800);
}

export function firstTel(value) {
  const text = String(value || '').replace(/[)]/g, '-').replace(/\s+/g, ' ').trim();
  const match = text.match(/0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/);
  return (match ? match[0] : text).slice(0, 50);
}

export function ifacMetro(sido, gugun) {
  const hay = `${sido || ''} ${gugun || ''}`;
  if (hay.includes('서울')) return 'SEOUL';
  if (hay.includes('경기') || hay.includes('김포') || hay.includes('부천') || hay.includes('시흥')) return 'GYEONGGI';
  return 'INCHEON';
}

export function contentIdFromRow(row) {
  const idx = String(row?.idx || '').replace(/\D/g, '');
  if (idx) return `ifc-${idx}`.slice(0, 40);
  const seed = `${row?.title || ''}|${row?.sdate || ''}|${row?.place || ''}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `ifc-${(hash >>> 0).toString(16).padStart(8, '0')}`.slice(0, 40);
}

export function parseIfacCultureXml(xml) {
  const text = String(xml || '');
  const code = tagValue(text, 'resultCode');
  const message = tagValue(text, 'resultMsg') || tagValue(text, 'errorMsg');
  if (code && !/^0000$/i.test(code) && !/^0007$/i.test(code)) {
    return { ok: false, code, message: message || '인천문화재단 API 오류', total: 0, rows: [] };
  }
  const total = Number(tagValue(text, 'totalCnt') || 0);
  const rows = [];
  const rowRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match = rowRe.exec(text);
  while (match) {
    const block = match[1];
    const row = {};
    for (const tag of TAGS) row[tag] = tagValue(block, tag);
    if (row.title && (row.sdate || row.edate)) rows.push(row);
    match = rowRe.exec(text);
  }
  return {
    ok: true,
    code: code || '0000',
    message: message || '정상 처리되었습니다.',
    total: total || rows.length,
    rows,
  };
}

export function countCategories(rows) {
  const counts = new Map();
  for (const row of rows || []) {
    const name = String(row.category || '기타').trim() || '기타';
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
}

export function toPersistableFestival(row) {
  const start = ymdDash(row.sdate) || ymdDash(row.edate);
  const end = ymdDash(row.edate) || start;
  const title = String(row.title || '').trim();
  if (!title || !start) return null;
  const place = String(row.place || '').trim();
  const sido = String(row.placeSido || '').trim();
  const gugun = String(row.placeGugun || '').trim();
  const detailUrl = extractHttpUrl(row.link);
  const homepage = extractHttpUrl(row.homepage);
  const reserveUrl = extractHttpUrl(row.reserveURL);
  const fee = String(row.fee || row.feeCase || row.fee_case || '').trim();
  const host = String(row.management || '').trim();
  const body = plainText(row.description);
  const description = [
    host ? `주최 ${host}` : '',
    fee ? `요금 ${fee}` : '',
    sido || gugun ? `지역 ${[sido, gugun].filter(Boolean).join(' ')}` : '',
    body,
    detailUrl ? `상세 ${detailUrl}` : '',
    homepage ? `홈페이지 ${homepage}` : '',
    reserveUrl ? `예매 ${reserveUrl}` : '',
  ].filter(Boolean).join('\n');
  const address = [sido, gugun, place].filter(Boolean).join(' ').trim();
  const metro = ifacMetro(sido, gugun);
  return {
    contentId: contentIdFromRow(row),
    title,
    category: String(row.category || '문화/예술').trim() || '문화/예술',
    eventStartDate: start,
    eventEndDate: end,
    firstImage: extractHttpUrl(row.poster) || extractHttpUrl(row.posterThumb),
    tel: firstTel(row.tel),
    overview: description,
    address: address || '인천',
    location_name: place || ([sido, gugun].filter(Boolean).join(' ') || '인천'),
    homepageUrl: homepage,
    detailUrl,
    feeInfo: fee,
    hostName: host,
    district: gugun,
    metro,
    regionalZone: metro,
    source: 'ifac',
  };
}
