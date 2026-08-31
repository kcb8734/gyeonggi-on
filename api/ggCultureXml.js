/** 경기도 문화행사(GGCULTUREVENTSTUS) XML 파서. 네트워크·DB 없이 순수 변환만 한다. */

const TAGS = [
  'INST_NM',
  'TITLE',
  'CATEGORY_NM',
  'URL',
  'EVENT_TM_INFO',
  'PARTCPT_EXPN_INFO',
  'TELNO_INFO',
  'HOST_INST_NM',
  'HMPG_URL',
  'IMAGE_URL',
  'BEGIN_DE',
  'END_DE',
  'WRITNG_DE',
];

function unescapeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function tagValue(block, tag) {
  const closed = block.match(new RegExp(`<${tag}\\s*/>`, 'i'));
  if (closed) return '';
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? unescapeXml(match[1]) : '';
}

export function ymdDash(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 8) return '';
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function extractHttpUrl(value) {
  const text = String(value || '').trim();
  const match = text.match(/https?:\/\/\S+/i);
  return match ? match[0].replace(/[)\].,]+$/, '') : '';
}

export function encodeMediaUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.pathname = url.pathname
      .split('/')
      .map((part) => {
        if (!part) return part;
        try {
          return encodeURIComponent(decodeURIComponent(part));
        } catch {
          return encodeURIComponent(part);
        }
      })
      .join('/');
    return url.toString();
  } catch {
    return raw.replace(/ /g, '%20');
  }
}

export function feeLabel(value) {
  const text = String(value || '').trim();
  if (!text || text === '0' || text === '무료') return '무료';
  if (/^\d+$/.test(text)) return `${Number(text).toLocaleString('ko-KR')}원`;
  return text;
}

export function contentIdFromRow(row) {
  const url = String(row?.URL || '');
  const slug = url.match(/\/([a-f0-9]{16,32})\/?$/i);
  if (slug) return `ggc-${slug[1]}`.slice(0, 40);
  const seed = `${row?.TITLE || ''}|${row?.BEGIN_DE || ''}|${row?.URL || ''}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `ggc-${(hash >>> 0).toString(16).padStart(8, '0')}`.slice(0, 40);
}

export function parseGgCultureXml(xml) {
  const text = String(xml || '');
  const resultBlock = text.match(/<RESULT>[\s\S]*?<\/RESULT>/i);
  const code = resultBlock ? tagValue(resultBlock[0], 'CODE') : '';
  const message = resultBlock ? tagValue(resultBlock[0], 'MESSAGE') : '';
  if (code && !/^INFO-000$/i.test(code)) {
    return { ok: false, code, message: message || '경기도 문화행사 API 오류', total: 0, rows: [] };
  }
  const total = Number(tagValue(text, 'list_total_count') || 0);
  const rows = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
  let match = rowRe.exec(text);
  while (match) {
    const block = match[1];
    const row = {};
    for (const tag of TAGS) row[tag] = tagValue(block, tag);
    if (row.TITLE && (row.BEGIN_DE || row.END_DE)) rows.push(row);
    match = rowRe.exec(text);
  }
  return {
    ok: true,
    code: code || 'INFO-000',
    message: message || '정상 처리되었습니다.',
    total: total || rows.length,
    rows,
  };
}

export function countCategories(rows) {
  const counts = new Map();
  for (const row of rows || []) {
    const name = String(row.CATEGORY_NM || row.category || '기타').trim() || '기타';
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
}

export function toPersistableFestival(row) {
  const start = ymdDash(row.BEGIN_DE) || ymdDash(row.END_DE);
  const end = ymdDash(row.END_DE) || start;
  const title = String(row.TITLE || '').trim();
  if (!title || !start) return null;
  const detailUrl = extractHttpUrl(row.URL) || String(row.URL || '').trim();
  const homepage = extractHttpUrl(row.HMPG_URL);
  const host = String(row.HOST_INST_NM || row.INST_NM || '').trim();
  const timeInfo = String(row.EVENT_TM_INFO || '').trim();
  const fee = feeLabel(row.PARTCPT_EXPN_INFO);
  const description = [
    timeInfo ? `시간 ${timeInfo}` : '',
    fee ? `요금 ${fee}` : '',
    host ? `주최 ${host}` : '',
    detailUrl ? `상세 ${detailUrl}` : '',
    homepage ? `홈페이지 ${homepage}` : '',
  ].filter(Boolean).join('\n');
  return {
    contentId: contentIdFromRow(row),
    title,
    category: String(row.CATEGORY_NM || '문화/예술').trim() || '문화/예술',
    eventStartDate: start,
    eventEndDate: end,
    firstImage: encodeMediaUrl(row.IMAGE_URL),
    tel: String(row.TELNO_INFO || '').trim(),
    overview: description,
    address: host || String(row.INST_NM || '경기도').trim(),
    location_name: host || String(row.INST_NM || '경기도').trim(),
    homepageUrl: homepage,
    detailUrl,
    eventTimeInfo: timeInfo,
    feeInfo: fee,
    hostName: host,
    source: 'ggc',
  };
}
