/**
 * 관리자 엑셀(.xlsx) → PostgreSQL 적재.
 * 한글 시트/컬럼 별칭과 지자체·가맹점·축제 외래키 조회를 지원합니다.
 */
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, municipalityRegionCode, persistTourFestivals } from './festivalDbSync.js';
import { METRO_LOCALITIES, REGION_LABEL, REGION_META, normalizeMetroId } from './metroLocalities.js';
import { searchFestival2 } from './tourLive.js';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

const TRUTHY = new Set(['1', 'true', 't', 'y', 'yes', 'o', '예', '맞음', 'on', '활성']);
const FALSY = new Set(['0', 'false', 'f', 'n', 'no', 'x', '아니오', '아님', 'off', '비활성']);
const MAX_UPLOAD_BYTES = 4_500_000;

export const SHEET_ALIASES = {
  municipalities: 'municipalities',
  지자체: 'municipalities',
  시군구: 'municipalities',
  festivals: 'festivals',
  축제: 'festivals',
  축제정보: 'festivals',
  조사표: 'festivals',
  개최계획: 'festivals',
  개최현황: 'festivals',
  지역축제: 'festivals',
  축제현황: 'festivals',
  문화축제: 'festivals',
  전국문화축제: 'festivals',
  merchants: 'merchants',
  가맹점: 'merchants',
  점포: 'merchants',
  소상공인: 'merchants',
  discount_promotions: 'discount_promotions',
  promotions: 'discount_promotions',
  프로모션: 'discount_promotions',
  할인: 'discount_promotions',
  coupons: 'coupons',
  쿠폰: 'coupons',
};

export const SKIP_SHEETS = {
  총괄: '요약 시트',
  응답보기: '문항/코드 시트',
  안내: '안내 시트',
  표지: '표지 시트',
  코드북: '문항/코드 시트',
  지침: '안내 시트',
  작성요령: '안내 시트',
  유의사항: '안내 시트',
  조사개요: '요약 시트',
};

export const TABLE_LABELS = {
  municipalities: '지자체',
  festivals: '축제',
  merchants: '가맹점',
  discount_promotions: '프로모션',
  coupons: '쿠폰',
};

const HEADER_HINTS = [
  '축제명', '행사명', '시군구', '시군구명', '개최장소', '장소',
  '시작일', '종료일', '축제시작일자', '축제종료일자', '개최기간',
  '지자체명', '상호명', '사업자등록번호', '프로모션명', '쿠폰코드',
  '시도', '시도명', '기초단체', '개최일', '축제내용',
];

const TITLE_FIELDS = ['축제명', '행사명', '축제이름', '축제한글명', 'title', '제목', '이름'];
const PLACE_FIELDS = [
  'municipality', '지자체명', '시군구', '시군구명', '시군', 'name', 'city',
  'address', '주소', 'location_name', '장소', '개최장소', 'metro_region', '권역',
  '시도', '시도명', '기초단체', '개최지역', '지역',
];
const SKIP_TITLES = new Set(['합계', '소계', '총계', '계', 'total', 'sum', '평균']);

export const LOAD_ORDER = [
  'municipalities',
  'festivals',
  'merchants',
  'discount_promotions',
  'coupons',
];

const COLUMNS = {
  municipalities: {
    required: ['name', 'region_code'],
    conflict: ['region_code'],
    aliases: {
      name: ['지자체명', '시군구', '이름', 'name'],
      region_code: ['지역코드', '코드', 'region_code'],
      metro_region: ['권역', '광역', 'metro_region'],
      budget_balance: ['예산잔액', '예산', 'budget_balance'],
      initial_budget: ['초기예산', 'initial_budget'],
      contact_email: ['담당자이메일', '연락처이메일', 'contact_email'],
      settlement_email: ['정산이메일', 'settlement_email'],
      mayor_name: ['단체장', '시장', '군수', 'mayor_name'],
      department: ['담당부서', '부서', 'department'],
    },
  },
  festivals: {
    required: ['title', 'start_date', 'end_date'],
    conflict: ['tour_content_id'],
    aliases: {
      title: ['축제명', '행사명', '축제이름', '축제한글명', '축제명한글', '제목', '이름', 'title'],
      description: ['설명', '소개', '축제내용', '주요내용', '행사내용', '내용', 'description'],
      start_date: [
        '시작일', '시작일자', '개최시작일', '축제시작일자', '축제시작일', '개최일',
        '개시일', '시작', '개최기간시작', '개최기간시작일', '기간시작', 'start_date',
      ],
      end_date: [
        '종료일', '종료일자', '개최종료일', '축제종료일자', '축제종료일', '종료',
        '개최기간종료', '개최기간종료일', '기간종료', 'end_date',
      ],
      location_name: [
        '장소', '개최장소', '행사장소', '개최위치', '소재지도로명주소', '도로명주소',
        '주소', 'location_name',
      ],
      latitude: ['위도', 'lat', 'latitude'],
      longitude: ['경도', 'lng', 'lon', 'longitude'],
      category: ['카테고리', '분류', '축제유형', '축제종류', '유형', 'category'],
      image_url: ['이미지', '이미지url', 'image_url'],
      is_trending: ['인기', '트렌딩', 'is_trending'],
      tour_content_id: ['관광공사id', 'contentid', 'content_id', 'tour_content_id'],
      tel: ['전화번호', '연락처', '담당자연락처', '문의처', 'tel'],
      source: ['출처', 'source'],
    },
  },
  merchants: {
    required: ['business_name', 'business_number', 'category', 'address'],
    conflict: ['business_number'],
    aliases: {
      business_name: ['상호명', '상호', '점포명', 'business_name'],
      business_number: ['사업자등록번호', '사업자번호', 'business_number'],
      category: ['업종', '카테고리', 'category'],
      address: ['주소', 'address'],
      latitude: ['위도', 'lat', 'latitude'],
      longitude: ['경도', 'lng', 'lon', 'longitude'],
      bank_name: ['은행', '은행명', 'bank_name'],
      bank_account_number: ['계좌번호', '정산계좌', 'bank_account_number'],
      is_verified: ['인증여부', '인증', 'is_verified'],
      owner_user_id: ['점주id', '소유자id', 'owner_user_id'],
    },
  },
  discount_promotions: {
    required: ['title', 'merchant_discount_rate', 'total_quantity', 'start_time', 'end_time'],
    conflict: ['id'],
    aliases: {
      title: ['프로모션명', '제목', 'title'],
      merchant_discount_rate: ['점주할인율', '자체할인율', 'merchant_discount_rate'],
      gov_matching_rate: ['지자체매칭율', '매칭율', 'gov_matching_rate'],
      max_discount_amount: ['최대할인액', '할인한도', 'max_discount_amount'],
      total_quantity: ['총수량', '발급수량', 'total_quantity'],
      remaining_quantity: ['잔여수량', 'remaining_quantity'],
      start_time: ['시작일시', '시작', 'start_time'],
      end_time: ['종료일시', '종료', 'end_time'],
      status: ['상태', 'status'],
      funding_type: ['재원유형', 'funding_type'],
      matching_status: ['매칭상태', 'matching_status'],
      coupon_type: ['쿠폰유형', 'coupon_type'],
    },
  },
  coupons: {
    required: ['code', 'title', 'discount_amount', 'expires_at'],
    conflict: ['code'],
    aliases: {
      code: ['쿠폰코드', '코드', 'code'],
      title: ['쿠폰명', '제목', 'title'],
      discount_amount: ['할인금액', '할인액', 'discount_amount'],
      is_used: ['사용여부', 'is_used'],
      used_at: ['사용일시', 'used_at'],
      expires_at: ['만료일시', '만료일', 'expires_at'],
      coupon_type: ['쿠폰유형', 'coupon_type'],
    },
  },
};

export function canon(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_\-()/]+/g, '');
}

export function normalizeHeader(value) {
  let text = String(value == null ? '' : value).trim();
  if (!text) return '';
  text = text.replace(/^\s*(?:문항|질문|항목)?\s*q?\s*\d+\s*[\.\)\:\-]/i, '');
  text = text.replace(/[\*＊]+/g, '');
  text = text.replace(/\([^)]*\)/g, '');
  text = text.replace(/\[[^\]]*\]/g, '');
  return text.replace(/\s+/g, ' ').trim();
}

export function yearFromFilename(name) {
  const match = String(name || '').match(/(20\d{2})/);
  return match ? Number(match[1]) : new Date().getFullYear();
}

export function skipReason(sheetName) {
  const raw = String(sheetName || '').trim();
  if (SKIP_SHEETS[raw]) return SKIP_SHEETS[raw];
  const key = canon(raw);
  const hit = Object.entries(SKIP_SHEETS).find(([alias]) => canon(alias) === key || key.startsWith(canon(alias)));
  return hit ? hit[1] : '';
}

export function isSkippedSheet(sheetName) {
  return Boolean(skipReason(sheetName));
}

export function isBlank(value) {
  if (value == null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (typeof value === 'number' && Number.isNaN(value)) return true;
  return false;
}

function aliasIndex(profile) {
  const index = new Map();
  Object.entries(profile.aliases).forEach(([column, names]) => {
    names.forEach((name) => index.set(canon(name), column));
    index.set(canon(column), column);
  });
  return index;
}

export function resolveTableName(sheetName, forced) {
  if (forced) return forced;
  const raw = String(sheetName || '').trim();
  if (!raw) return '';
  if (isSkippedSheet(raw)) return '';
  if (SHEET_ALIASES[raw]) return SHEET_ALIASES[raw];
  const key = canon(raw);
  const hit = Object.entries(SHEET_ALIASES).find(([alias]) => canon(alias) === key);
  return hit ? hit[1] : raw;
}

export function detectTableFromHeaders(headers) {
  const keys = (headers || []).map((header) => canon(normalizeHeader(header))).filter(Boolean);
  const has = (...names) => names.some((name) => keys.includes(canon(name)));
  if (has('상호명', '사업자등록번호', '사업자번호')) return 'merchants';
  if (has('프로모션명', '점주할인율')) return 'discount_promotions';
  if (has('쿠폰코드') && has('할인금액', '할인액')) return 'coupons';
  if (has('지자체명') && has('지역코드') && !has('축제명', '행사명')) return 'municipalities';
  if (
    has('축제명', '행사명', '축제이름')
    && has('시작일', '시작일자', '축제시작일자', '축제시작일', '개최시작일', '개최기간', '종료일', '축제종료일자', '개최기간시작')
  ) {
    return 'festivals';
  }
  if (has('축제명', '행사명') && has('시군구', '시군구명', '개최장소', '장소')) return 'festivals';
  return '';
}

export function toBool(value, fallback = null) {
  if (isBlank(value)) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Boolean(value);
  const key = canon(value);
  if (TRUTHY.has(key)) return true;
  if (FALSY.has(key)) return false;
  throw new Error('불리언으로 변환할 수 없습니다: ' + value);
}

export function toNumber(value) {
  if (isBlank(value)) return null;
  if (typeof value === 'number') return value;
  const text = String(value).trim().replace(/,/g, '');
  const n = Number(text);
  if (!Number.isFinite(n)) throw new Error('숫자로 변환할 수 없습니다: ' + value);
  return n;
}

export function toInt(value) {
  const n = toNumber(value);
  return n == null ? null : Math.trunc(n);
}

export function toText(value) {
  if (isBlank(value)) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

export function excelSerialToDate(serial) {
  const utc = Date.UTC(1899, 11, 30) + Math.round(Number(serial) * 86400000);
  return new Date(utc).toISOString().slice(0, 10);
}

function padIso(year, month, day) {
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (Number.isNaN(Date.parse(iso))) return null;
  return iso;
}

export function toDate(value, yearHint = new Date().getFullYear()) {
  if (isBlank(value)) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && value > 59 && value < 80000) {
    return excelSerialToDate(value);
  }
  const text = String(value).trim();
  const full = text.match(/(20\d{2})\s*[.\-\/년]?\s*(\d{1,2})\s*[.\-\/월]?\s*(\d{1,2})/);
  if (full) {
    const iso = padIso(full[1], full[2], full[3]);
    if (iso) return iso;
  }
  const compact = text.match(/^(20\d{2})(\d{2})(\d{2})$/);
  if (compact) {
    const iso = padIso(compact[1], compact[2], compact[3]);
    if (iso) return iso;
  }
  const dotted = text.replace(/\./g, '-').replace(/\//g, '-').replace(/[년월]/g, '-').replace(/일/g, '');
  const match = dotted.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const iso = padIso(match[1], match[2], match[3]);
    if (iso) return iso;
  }
  const short = dotted.match(/^(\d{1,2})-(\d{1,2})$/);
  if (short) {
    const iso = padIso(yearHint, short[1], short[2]);
    if (iso) return iso;
  }
  throw new Error('날짜로 변환할 수 없습니다: ' + value);
}

export function parsePeriod(value, yearHint = new Date().getFullYear()) {
  if (isBlank(value)) return { start: null, end: null };
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const iso = value.toISOString().slice(0, 10);
    return { start: iso, end: iso };
  }
  if (typeof value === 'number' && value > 59 && value < 80000) {
    const iso = excelSerialToDate(value);
    return { start: iso, end: iso };
  }
  const text = String(value).trim();
  const full = [...text.matchAll(/(20\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/g)];
  if (full.length >= 1) {
    const start = padIso(full[0][1], full[0][2], full[0][3]);
    const end = full[1] ? padIso(full[1][1], full[1][2], full[1][3]) : start;
    return { start, end };
  }
  const ymd = [...text.matchAll(/(20\d{2})(\d{2})(\d{2})/g)];
  if (ymd.length >= 1 && ymd[0][0].length === 8) {
    const start = padIso(ymd[0][1], ymd[0][2], ymd[0][3]);
    const end = ymd[1] ? padIso(ymd[1][1], ymd[1][2], ymd[1][3]) : start;
    return { start, end };
  }
  const shorts = [...text.matchAll(/(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})\s*일?/g)];
  if (shorts.length >= 1) {
    const start = padIso(yearHint, shorts[0][1], shorts[0][2]);
    const end = shorts[1] ? padIso(yearHint, shorts[1][1], shorts[1][2]) : start;
    return { start, end };
  }
  try {
    const iso = toDate(value, yearHint);
    return { start: iso, end: iso };
  } catch {
    return { start: null, end: null };
  }
}

export function enrichFestivalRow(raw, yearHint = new Date().getFullYear()) {
  const out = Object.assign({}, raw);
  const period = pick(out, ['개최기간', '행사기간', '축제기간', '기간', '개최일시', '행사일시']);
  const parsed = parsePeriod(period, yearHint);
  const hasStart = !isBlank(pick(out, ['시작일', 'start_date', '축제시작일자', '축제시작일', '개최시작일', '시작일자', '개최기간시작']));
  const hasEnd = !isBlank(pick(out, ['종료일', 'end_date', '축제종료일자', '축제종료일', '개최종료일', '종료일자', '개최기간종료']));
  if (parsed.start && !hasStart) out['시작일'] = parsed.start;
  if (parsed.end && !hasEnd) out['종료일'] = parsed.end;
  const city = pick(out, ['시군구명', '시군구', '시군', '기초단체', '지자체명']);
  const sido = pick(out, ['시도', '시도명', '광역단체']);
  if (city && isBlank(out['시군구'])) out['시군구'] = city;
  if (sido && city && isBlank(out['개최지역'])) out['개최지역'] = `${sido} ${city}`;
  out.__yearHint = yearHint;
  return out;
}

export function isIgnorableFestivalRow(raw, yearHint) {
  const title = pick(enrichFestivalRow(raw, yearHint), TITLE_FIELDS);
  if (isBlank(title)) return true;
  return SKIP_TITLES.has(canon(title));
}

export function toDateTime(value) {
  if (isBlank(value)) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const text = String(value).trim().replace('T', ' ');
  const date = toDate(text.slice(0, 10));
  const time = text.slice(11, 19) || '00:00:00';
  const iso = `${date}T${time.length === 5 ? time + ':00' : time}`;
  if (Number.isNaN(Date.parse(iso))) throw new Error('일시로 변환할 수 없습니다: ' + value);
  return new Date(iso).toISOString();
}

const CONVERTERS = {
  name: toText,
  region_code: toText,
  metro_region: toText,
  budget_balance: toNumber,
  initial_budget: toNumber,
  contact_email: toText,
  settlement_email: toText,
  mayor_name: toText,
  department: toText,
  title: toText,
  description: toText,
  start_date: toDate,
  end_date: toDate,
  location_name: toText,
  latitude: toNumber,
  longitude: toNumber,
  category: toText,
  image_url: toText,
  is_trending: (v) => toBool(v, false),
  tour_content_id: toText,
  tel: toText,
  source: toText,
  business_name: toText,
  business_number: toText,
  address: toText,
  bank_name: toText,
  bank_account_number: toText,
  is_verified: (v) => toBool(v, false),
  owner_user_id: toText,
  merchant_discount_rate: toNumber,
  gov_matching_rate: toNumber,
  max_discount_amount: toNumber,
  total_quantity: toInt,
  remaining_quantity: toInt,
  start_time: toDateTime,
  end_time: toDateTime,
  status: toText,
  funding_type: toText,
  matching_status: toText,
  coupon_type: toText,
  code: toText,
  discount_amount: toInt,
  is_used: (v) => toBool(v, false),
  used_at: toDateTime,
  expires_at: toDateTime,
};

function pick(row, names) {
  const byKey = new Map();
  Object.keys(row || {}).forEach((key) => {
    if (String(key).startsWith('__')) return;
    byKey.set(canon(key), row[key]);
    const normalized = normalizeHeader(key);
    if (normalized) byKey.set(canon(normalized), row[key]);
  });
  for (const name of names) {
    const value = byKey.get(canon(name)) ?? byKey.get(canon(normalizeHeader(name)));
    if (!isBlank(value)) return value;
  }
  return null;
}

function lookupColumn(index, header) {
  if (!header || String(header).startsWith('__')) return null;
  const candidates = [header, normalizeHeader(header)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const hit = index.get(canon(candidate));
    if (hit) return hit;
  }
  return null;
}

export function applyProfile(raw, table, options = {}) {
  const profile = COLUMNS[table];
  if (!profile) {
    const out = {};
    Object.entries(raw || {}).forEach(([key, value]) => {
      if (String(key).startsWith('__')) return;
      if (!isBlank(value)) out[key] = value;
    });
    return out;
  }
  const yearHint = options.yearHint || raw?.__yearHint || new Date().getFullYear();
  const source = table === 'festivals' ? enrichFestivalRow(raw, yearHint) : raw;
  const index = aliasIndex(profile);
  const out = {};
  Object.entries(source || {}).forEach(([header, value]) => {
    const column = lookupColumn(index, header);
    if (!column || isBlank(value) || !isBlank(out[column])) return;
    const convert = CONVERTERS[column] || toText;
    out[column] = convert.length > 1 && (column === 'start_date' || column === 'end_date')
      ? toDate(value, yearHint)
      : convert(value);
  });
  if (table === 'merchants' && !out.owner_user_id) out.owner_user_id = randomUUID();
  if (table === 'discount_promotions' && out.remaining_quantity == null && out.total_quantity != null) {
    out.remaining_quantity = out.total_quantity;
  }
  if (table === 'festivals') {
    if (!out.end_date && out.start_date) out.end_date = out.start_date;
    if (out.title) out.title = String(out.title).slice(0, 100);
    if (out.location_name) out.location_name = String(out.location_name).slice(0, 150);
  }
  const missing = profile.required.filter((col) => isBlank(out[col]));
  if (missing.length) throw new Error(`${table} 필수 값이 없습니다: ${missing.join(', ')}`);
  return out;
}

function cityIndex() {
  const rows = [];
  Object.entries(METRO_LOCALITIES).forEach(([metro, locs]) => {
    (locs || []).forEach((loc) => {
      const label = String(loc.label || loc.id || '').replace(/^(서울|부산|대구|인천|광주|대전|울산)\s+/, '');
      if (label.length < 2) return;
      rows.push({ metro, city: label, key: canon(label) });
    });
  });
  rows.sort((a, b) => b.key.length - a.key.length);
  return rows;
}

const CITY_INDEX = cityIndex();

export function metroFromText(value) {
  const text = toText(value);
  if (!text) return null;
  const compact = text.toUpperCase().replace(/\s+/g, '');
  if (REGION_META[compact]) return normalizeMetroId(compact);
  const sidoKey = canon(text)
    .replace(/특별자치시/g, '')
    .replace(/특별자치도/g, '')
    .replace(/광역시/g, '')
    .replace(/특별시/g, '')
    .replace(/자치시/g, '');
  const sido = {
    서울: 'SEOUL', 부산: 'BUSAN', 대구: 'DAEGU', 인천: 'INCHEON', 광주: 'GWANGJU',
    대전: 'DAEJEON', 울산: 'ULSAN', 세종: 'SEJONG', 경기: 'GYEONGGI', 경기도: 'GYEONGGI',
    강원: 'GANGWON', 강원도: 'GANGWON', 충북: 'CHUNGBUK', 충청북도: 'CHUNGBUK',
    충남: 'CHUNGNAM', 충청남도: 'CHUNGNAM', 전북: 'JEONBUK', 전라북도: 'JEONBUK',
    전남: 'JEONNAM', 전라남도: 'JEONNAM', 경북: 'GYEONGBUK', 경상북도: 'GYEONGBUK',
    경남: 'GYEONGNAM', 경상남도: 'GYEONGNAM', 제주: 'JEJU', 제주도: 'JEJU',
  }[sidoKey] || {
    서울: 'SEOUL', 부산: 'BUSAN', 대구: 'DAEGU', 인천: 'INCHEON', 광주: 'GWANGJU',
    대전: 'DAEJEON', 울산: 'ULSAN', 세종: 'SEJONG', 경기: 'GYEONGGI',
    강원: 'GANGWON', 충북: 'CHUNGBUK', 충남: 'CHUNGNAM', 전북: 'JEONBUK',
    전남: 'JEONNAM', 경북: 'GYEONGBUK', 경남: 'GYEONGNAM', 제주: 'JEJU',
  }[sidoKey.replace(/도$/, '')];
  if (sido) return sido;
  const byLabel = Object.entries(REGION_LABEL).find(([, label]) => (
    canon(label) === canon(text) || text.includes(label) || label.includes(text)
  ));
  if (byLabel) return byLabel[0];
  const hay = canon(text);
  const hit = CITY_INDEX.find((row) => hay.includes(row.key));
  return hit ? hit.metro : null;
}

export function cityFromText(value) {
  const text = toText(value);
  if (!text) return null;
  const hay = canon(text);
  const hit = CITY_INDEX.find((row) => hay.includes(row.key));
  return hit ? hit.city : null;
}

function needsTourCrawl(table, mapped) {
  if (table === 'municipalities') return true;
  if (table !== 'festivals') return false;
  const contentId = String(mapped.tour_content_id || '');
  if (!contentId || contentId.startsWith('excel-')) return true;
  if (mapped.latitude == null || mapped.longitude == null) return true;
  if (!mapped.image_url) return true;
  return false;
}

function resolveTableForSheet(sheet, forced) {
  if (forced) return forced;
  if (isSkippedSheet(sheet.name)) return '';
  const named = resolveTableName(sheet.name);
  if (named && COLUMNS[named]) return named;
  const headers = (sheet.rows && sheet.rows[0])
    ? Object.keys(sheet.rows[0]).filter((key) => !String(key).startsWith('__'))
    : [];
  return detectTableFromHeaders(headers);
}

function sheetPayload(sheet, extra) {
  const table = extra.table || null;
  return Object.assign({
    sheet: sheet.name,
    table,
    tableLabel: table ? (TABLE_LABELS[table] || table) : (extra.skipped ? '건너뜀' : '미지원'),
    known: Boolean(table && COLUMNS[table]),
    skipped: Boolean(extra.skipped),
    reason: extra.reason || '',
    rows: (sheet.rows || []).length,
    valid: extra.valid || 0,
    errorCount: extra.errors ? extra.errors.length : 0,
    errors: (extra.errors || []).slice(0, 8),
    samples: extra.samples || [],
  }, extra.more || {});
}

export function analyzeSheets(sheets, options = {}) {
  const analyzed = [];
  const cities = new Set();
  const metroNeed = new Map();
  let validTotal = 0;
  let errorTotal = 0;
  let crawlHints = 0;
  const yearHint = options.yearHint || new Date().getFullYear();

  (sheets || []).forEach((sheet) => {
    if (isSkippedSheet(sheet.name)) {
      analyzed.push(sheetPayload(sheet, {
        skipped: true,
        reason: skipReason(sheet.name),
        valid: 0,
        errors: [],
        samples: [],
      }));
      return;
    }
    const table = resolveTableForSheet(sheet);
    const errors = [];
    const samples = [];
    let valid = 0;
    if (!COLUMNS[table]) {
      analyzed.push(sheetPayload(sheet, {
        table: null,
        reason: '알 수 없는 시트/테이블입니다: ' + sheet.name,
        valid: 0,
        errors: [],
        samples: [],
      }));
      return;
    }
    (sheet.rows || []).forEach((raw, index) => {
      if (table === 'festivals' && isIgnorableFestivalRow(raw, yearHint)) return;
      try {
        const mapped = applyProfile(raw, table, { yearHint });
        valid += 1;
        const place = pick(Object.assign({}, raw, mapped), PLACE_FIELDS);
        const city = mapped.name && table === 'municipalities'
          ? mapped.name
          : (cityFromText(place) || toText(pick(raw, ['지자체명', '시군구', '시군구명'])));
        if (city) cities.add(city);
        const metro = metroFromText(pick(raw, ['metro_region', '권역', '시도', '시도명']))
          || metroFromText(place)
          || metroFromText(city);
        if (metro) {
          const prev = metroNeed.get(metro) || { metro, cities: new Set(), hints: 0 };
          if (city) prev.cities.add(city);
          if (needsTourCrawl(table, mapped)) {
            prev.hints += 1;
            crawlHints += 1;
          }
          metroNeed.set(metro, prev);
        } else if (needsTourCrawl(table, mapped)) {
          crawlHints += 1;
        }
        if (samples.length < 3) {
          samples.push(mapped.title || mapped.name || mapped.business_name || mapped.code || `${table} ${index + 1}`);
        }
      } catch (err) {
        errors.push({ row: index + 2, error: err && err.message ? err.message : String(err) });
      }
    });
    validTotal += valid;
    errorTotal += errors.length;
    analyzed.push(sheetPayload(sheet, {
      table,
      valid,
      errors,
      samples,
    }));
  });

  if (!metroNeed.size && (validTotal || cities.size)) {
    metroNeed.set('GYEONGGI', { metro: 'GYEONGGI', cities, hints: crawlHints || 1 });
  }

  const crawlPlan = [...metroNeed.values()].map((item) => ({
    metro: item.metro,
    label: REGION_LABEL[item.metro] || item.metro,
    cities: [...item.cities],
    hints: item.hints,
    reason: item.hints
      ? `엑셀 ${item.hints}건을 TourAPI 축제 정보로 보강`
      : `${item.cities.size || 1}개 시군 축제를 동기화`,
  }));

  return {
    sheets: analyzed,
    cities: [...cities],
    crawlPlan,
    totals: {
      sheets: analyzed.length,
      rows: analyzed.reduce((sum, row) => sum + row.rows, 0),
      valid: validTotal,
      errors: errorTotal,
      crawlMetros: crawlPlan.length,
    },
  };
}

export function analyzeExcelFromPayload(body) {
  const { filename, buffer } = decodeExcelPayload(body || {});
  const yearHint = yearFromFilename(filename);
  const sheets = parseWorkbook(buffer, { yearHint });
  const loadable = sheets.filter((sheet) => !isSkippedSheet(sheet.name) && sheet.rows.length);
  if (!loadable.length) {
    throw new Error('적재할 축제 행이 없습니다. 조사표의 축제명·시작일·종료일·장소·시군구를 확인하세요.');
  }
  const analysis = analyzeSheets(sheets, { yearHint });
  return {
    ok: true,
    filename,
    message: `시트 ${analysis.totals.sheets}개 · 유효 ${analysis.totals.valid}건 · 오류 ${analysis.totals.errors}건 · 크롤링 권역 ${analysis.totals.crawlMetros}곳`,
    analysis,
  };
}

export async function crawlPlannedMetros(metros, options = {}) {
  const unique = [...new Set((metros || []).map((item) => normalizeMetroId(item)).filter(Boolean))].slice(0, 8);
  if (!unique.length) unique.push('GYEONGGI');
  const search = options.searchFestival2 || searchFestival2;
  const persist = options.persistTourFestivals || persistTourFestivals;
  const runs = [];
  for (const metro of unique) {
    const result = await search({ metro });
    const festivals = (result && result.festivals) || [];
    const saved = await persist(festivals);
    runs.push({
      metro,
      label: REGION_LABEL[metro] || metro,
      fetched: festivals.length,
      upserted: saved && saved.upserted ? saved.upserted : 0,
      skipped: saved && saved.skipped ? saved.skipped : 0,
      persisted: Boolean(saved && saved.ok),
      source: (result && result.source) || 'none',
      message: (saved && saved.message) || '',
    });
  }
  const upserted = runs.reduce((sum, row) => sum + row.upserted, 0);
  const fetched = runs.reduce((sum, row) => sum + row.fetched, 0);
  return {
    ok: true,
    crawled: runs.length,
    fetched,
    upserted,
    message: runs.map((row) => `${row.label} ${row.fetched}건 수집/${row.upserted}건 저장`).join(' · '),
    runs,
  };
}

export function loadXlsx() {
  const candidates = [
    'xlsx',
    path.join(process.cwd(), 'backend/node_modules/xlsx'),
    path.join(process.cwd(), 'node_modules/xlsx'),
    path.join(here, '../backend/node_modules/xlsx'),
  ];
  for (const id of candidates) {
    try {
      return require(id);
    } catch {
      // try next
    }
  }
  return null;
}

export const TEMPLATE_SHEETS = [
  ['지자체', [
    ['지자체명', '지역코드', '권역', '예산잔액', '담당자이메일'],
    ['수원시', 'GG_SUWON', 'GYEONGGI', 50000000, 'suwon@example.go.kr'],
    ['용인시', 'GG_YONGIN', 'GYEONGGI', 30000000, 'yongin@example.go.kr'],
  ]],
  ['축제', [
    ['축제명', '지자체명', '지역코드', '시작일', '종료일', '장소', '위도', '경도', '카테고리', '관광공사ID'],
    ['수원화성문화제', '수원시', 'GG_SUWON', '2026-09-01', '2026-09-30', '수원화성 행궁광장', 37.287, 127.013, '문화/예술', 'EXCEL-FEST-001'],
  ]],
  ['가맹점', [
    ['상호명', '사업자등록번호', '업종', '주소', '지자체명', '지역코드', '위도', '경도', '인증여부'],
    ['화성행궁 한정식', '123-45-00001', '음식점', '경기도 수원시 팔달구 정조로 825', '수원시', 'GG_SUWON', 37.2865, 127.0135, '예'],
  ]],
  ['프로모션', [
    ['프로모션명', '사업자등록번호', '축제명', '점주할인율', '지자체매칭율', '총수량', '시작일시', '종료일시'],
    ['화성문화제 제휴 10% 할인', '123-45-00001', '수원화성문화제', 5, 5, 100, '2026-09-01 00:00:00', '2026-09-30 23:59:59'],
  ]],
];

export function buildTemplateBuffer() {
  const XLSX = loadXlsx();
  if (!XLSX) throw new Error('xlsx 패키지가 필요합니다. backend 에 xlsx 를 설치하세요.');
  const workbook = XLSX.utils.book_new();
  TEMPLATE_SHEETS.forEach(([title, rows]) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), title);
  });
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function parseWorkbook(buffer, options = {}) {
  const XLSX = loadXlsx();
  if (!XLSX) throw new Error('xlsx 패키지가 필요합니다. backend 에 xlsx 를 설치하세요.');
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const yearHint = options.yearHint || new Date().getFullYear();
  return (workbook.SheetNames || []).map((name) => {
    const sheet = workbook.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
    return { name, rows: recordsFromAoa(aoa, { yearHint }) };
  });
}

function cellText(value) {
  if (isBlank(value)) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function scoreHeaderRow(cells) {
  const texts = (cells || []).map((cell) => normalizeHeader(cell)).filter((text) => text && Number.isNaN(Number(text)));
  if (texts.length < 2) return 0;
  let score = 0;
  texts.forEach((text) => {
    const key = canon(text);
    if (HEADER_HINTS.some((hint) => key === canon(hint) || key.includes(canon(hint)))) score += 2;
    if (/명$/.test(text) || /일자$/.test(text) || /장소$/.test(text) || /기간$/.test(text) || /내용$/.test(text)) score += 1;
  });
  return score;
}

function looksLikeSubHeader(cells) {
  const texts = (cells || []).map((cell) => normalizeHeader(cell)).filter(Boolean);
  if (!texts.length) return false;
  const hits = texts.filter((text) => /^(시작|종료|시작일|종료일|일|월|장소|내용|비고)$/.test(text) || text.length <= 3);
  return hits.length >= Math.max(1, Math.ceil(texts.length / 2));
}

function mergeHeaderRows(top, bottom) {
  const width = Math.max(top.length, bottom.length);
  const out = [];
  for (let i = 0; i < width; i += 1) {
    const a = cellText(top[i]);
    const b = cellText(bottom[i]);
    if (a && b && canon(normalizeHeader(a)) !== canon(normalizeHeader(b))) out.push(`${a} ${b}`);
    else out.push(a || b);
  }
  return out;
}

export function recordsFromAoa(aoa, options = {}) {
  const rows = Array.isArray(aoa) ? aoa : [];
  let bestIndex = -1;
  let bestScore = 0;
  const scan = Math.min(rows.length, 12);
  for (let i = 0; i < scan; i += 1) {
    const score = scoreHeaderRow(rows[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  if (bestIndex < 0) {
    bestIndex = rows.findIndex((row) => (row || []).some((cell) => !isBlank(cell)));
  }
  if (bestIndex < 0) return [];
  let headers = (rows[bestIndex] || []).map((cell) => cellText(cell));
  let dataStart = bestIndex + 1;
  const next = rows[bestIndex + 1];
  if (next && (looksLikeSubHeader(next) || next.some((cell) => /^(시작|종료)$/.test(cellText(cell))))) {
    headers = mergeHeaderRows(headers, next);
    dataStart += 1;
  }
  const yearHint = options.yearHint || new Date().getFullYear();
  const records = [];
  for (let r = dataStart; r < rows.length; r += 1) {
    const values = rows[r] || [];
    if (!values.some((cell) => !isBlank(cell))) continue;
    const record = { __yearHint: yearHint };
    headers.forEach((header, i) => {
      if (header && !isBlank(values[i])) record[header] = values[i];
    });
    if (Object.keys(record).some((key) => !key.startsWith('__'))) records.push(record);
  }
  return records;
}

export function decodeExcelPayload(body) {
  const filename = String((body && (body.filename || body.name)) || 'upload.xlsx');
  const raw = body && (body.content || body.file || body.base64 || body.xlsx);
  if (raw == null || raw === '') {
    throw new Error('엑셀 파일이 필요합니다. .xlsx 파일을 선택하세요.');
  }
  let buffer;
  if (Buffer.isBuffer(raw)) buffer = raw;
  else if (typeof raw === 'string') {
    const cleaned = raw.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
    buffer = Buffer.from(cleaned, 'base64');
  } else {
    throw new Error('엑셀 파일 형식이 올바르지 않습니다.');
  }
  if (buffer.length < 4) throw new Error('엑셀 파일이 비어 있습니다.');
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('엑셀 파일은 4.5MB 이하여야 합니다.');
  }
  const lower = filename.toLowerCase();
  if (lower && !lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
    throw new Error('xlsx 또는 xls 파일만 올릴 수 있습니다.');
  }
  return { filename, buffer };
}

function sheetSortKey(name) {
  const table = resolveTableName(name);
  const index = LOAD_ORDER.indexOf(table);
  return index < 0 ? LOAD_ORDER.length : index;
}

async function oneId(client, sql, params) {
  const result = await client.query(sql, params);
  const row = result && result.rows && result.rows[0];
  return row && row.id ? String(row.id) : null;
}

async function resolveMunicipalityId(client, raw, mapped, createMissing) {
  if (mapped.municipality_id) return mapped.municipality_id;
  const rawName = toText(pick(raw, [
    'municipality', 'municipality_name', '지자체', '지자체명', '시군구명', '시군구', '시군', '기초단체',
  ]));
  const name = cityFromText(rawName)
    || rawName
    || cityFromText(pick(raw, ['주소', '개최장소', '장소', 'location_name']));
  const region = toText(pick(raw, ['region_code', '지역코드'])) || (name ? municipalityRegionCode(name) : null);
  if (!name && !region) return null;
  const found = await oneId(
    client,
    `SELECT id FROM municipalities
     WHERE ($1::text IS NOT NULL AND name = $1)
        OR ($2::text IS NOT NULL AND region_code = $2)
     LIMIT 1`,
    [name, region],
  );
  if (found) return found;
  if (!createMissing || !name) return null;
  const metro = toText(pick(raw, ['metro_region', '권역']))
    || metroFromText(pick(raw, ['시도', '시도명']))
    || metroFromText(name)
    || 'GYEONGGI';
  return oneId(
    client,
    `INSERT INTO municipalities (name, region_code, budget_balance, metro_region)
     VALUES ($1, $2, 0, COALESCE($3, 'GYEONGGI'))
     ON CONFLICT (region_code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name, region, metro],
  );
}

async function resolveMerchantId(client, raw, mapped) {
  if (mapped.merchant_id) return mapped.merchant_id;
  const number = toText(pick(Object.assign({}, raw, mapped), ['business_number', '사업자등록번호', '사업자번호']));
  const name = toText(pick(raw, ['merchant', 'business_name', '상호명', '상호']));
  if (number) return oneId(client, 'SELECT id FROM merchants WHERE business_number = $1 LIMIT 1', [number]);
  if (name) return oneId(client, 'SELECT id FROM merchants WHERE business_name = $1 LIMIT 1', [name]);
  return null;
}

async function resolveFestivalId(client, raw, mapped) {
  if (mapped.festival_id) return mapped.festival_id;
  const contentId = toText(pick(Object.assign({}, raw, mapped), ['tour_content_id', '관광공사ID', 'contentid']));
  const title = toText(pick(raw, ['festival', 'festival_title', '축제명', '축제']));
  if (contentId) {
    const found = await oneId(client, 'SELECT id FROM festivals WHERE tour_content_id = $1 LIMIT 1', [contentId]);
    if (found) return found;
  }
  if (title) return oneId(client, 'SELECT id FROM festivals WHERE title = $1 ORDER BY created_at DESC LIMIT 1', [title]);
  return null;
}

function usableRow(row) {
  const out = {};
  Object.entries(row).forEach(([key, value]) => {
    if (value !== undefined && value !== null) out[key] = value;
  });
  return out;
}

function buildUpsert(table, row, conflict) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new Error('허용되지 않는 테이블 이름입니다: ' + table);
  const cols = Object.keys(row);
  cols.forEach((col) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(col)) throw new Error('허용되지 않는 컬럼 이름입니다: ' + col);
  });
  const placeholders = cols.map((_, i) => '$' + (i + 1)).join(', ');
  let sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
  const conflictCols = (conflict || []).filter((col) => cols.includes(col));
  const skipUpdate = new Set(['id', 'owner_user_id']);
  if (conflictCols.length) {
    const updates = cols.filter((col) => !conflictCols.includes(col) && !skipUpdate.has(col));
    if (updates.length) {
      sql += ` ON CONFLICT (${conflictCols.join(', ')}) DO UPDATE SET ${updates.map((col) => `${col} = EXCLUDED.${col}`).join(', ')}`;
    } else {
      sql += ` ON CONFLICT (${conflictCols.join(', ')}) DO NOTHING`;
    }
  }
  sql += ' RETURNING id';
  return { sql, values: cols.map((col) => row[col]) };
}

export async function persistSheets(sheets, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const createMissing = options.createMissing !== false;
  const yearHint = options.yearHint || new Date().getFullYear();
  const db = Object.prototype.hasOwnProperty.call(options, 'db') ? options.db : getPool();
  const preview = sheets.map((sheet) => ({
    sheet: sheet.name,
    table: resolveTableForSheet(sheet, options.table),
    rows: sheet.rows.length,
  }));
  if (!db) {
    return {
      ok: true,
      persisted: false,
      dryRun: true,
      message: 'DATABASE_URL이 없어 미리보기만 했습니다. 시트 ' + preview.length + '개를 읽었습니다.',
      sheets: preview,
    };
  }
  const ordered = [...sheets].sort((a, b) => sheetSortKey(a.name) - sheetSortKey(b.name));
  const client = await db.connect();
  const summary = [];
  try {
    await client.query('BEGIN');
    for (const sheet of ordered) {
      if (isSkippedSheet(sheet.name)) {
        summary.push({
          sheet: sheet.name,
          table: null,
          tableLabel: '건너뜀',
          inserted: 0,
          skipped: true,
          reason: skipReason(sheet.name),
        });
        continue;
      }
      const table = resolveTableForSheet(sheet, options.table);
      const profile = COLUMNS[table];
      if (!profile) {
        summary.push({
          sheet: sheet.name,
          table: null,
          tableLabel: '미지원',
          inserted: 0,
          skipped: true,
          reason: '알 수 없는 시트/테이블입니다: ' + sheet.name,
        });
        continue;
      }
      let inserted = 0;
      const errors = [];
      for (let i = 0; i < sheet.rows.length; i += 1) {
        const raw = sheet.rows[i];
        if (table === 'festivals' && isIgnorableFestivalRow(raw, yearHint)) continue;
        try {
          const mapped = applyProfile(raw, table, { yearHint });
          const sourced = table === 'festivals' ? enrichFestivalRow(raw, yearHint) : raw;
          if (table === 'festivals' || table === 'merchants' || table === 'coupons') {
            const municipalityId = await resolveMunicipalityId(client, sourced, mapped, createMissing && table !== 'coupons');
            if (municipalityId) mapped.municipality_id = municipalityId;
            else if (table !== 'coupons') throw new Error('지자체(지자체명 또는 지역코드)를 찾을 수 없습니다');
          }
          if (table === 'discount_promotions' || table === 'coupons') {
            const merchantId = await resolveMerchantId(client, raw, mapped);
            if (merchantId) mapped.merchant_id = merchantId;
            else if (table === 'discount_promotions') throw new Error('가맹점(사업자등록번호 또는 상호명)을 찾을 수 없습니다');
          }
          if (table === 'discount_promotions') {
            const festivalId = await resolveFestivalId(client, raw, mapped);
            if (festivalId) mapped.festival_id = festivalId;
          }
          if (table === 'festivals') {
            mapped.source = mapped.source || 'excel';
            if (!mapped.tour_content_id) {
              mapped.tour_content_id = 'excel-' + canon(mapped.title) + '-' + String(mapped.start_date || '');
            }
          }
          const row = usableRow(mapped);
          let conflict = profile.conflict;
          if (table === 'festivals' && !row.tour_content_id) conflict = row.id ? ['id'] : [];
          if (table === 'discount_promotions' && !row.id) conflict = [];
          const { sql, values } = buildUpsert(table, row, conflict);
          await client.query(sql, values);
          inserted += 1;
        } catch (err) {
          const message = `${sheet.name} ${i + 2}행: ${err && err.message ? err.message : err}`;
          if (table === 'festivals') {
            errors.push({ row: i + 2, error: err && err.message ? err.message : String(err) });
            continue;
          }
          throw new Error(message);
        }
      }
      if (!inserted && errors.length) {
        throw new Error(errors[0].error.startsWith(sheet.name) ? errors[0].error : `${sheet.name} ${errors[0].row}행: ${errors[0].error}`);
      }
      summary.push({
        sheet: sheet.name,
        table,
        tableLabel: TABLE_LABELS[table] || table,
        inserted,
        errorCount: errors.length,
        errors: errors.slice(0, 8),
      });
    }
    if (dryRun) await client.query('ROLLBACK');
    else await client.query('COMMIT');
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
  const total = summary.reduce((sum, row) => sum + row.inserted, 0);
  if (!total) {
    throw new Error('적재할 축제 행이 없습니다. 조사표의 축제명·시작일·종료일·장소·시군구를 확인하세요.');
  }
  return {
    ok: true,
    persisted: !dryRun,
    dryRun,
    message: dryRun
      ? `미리보기 ${total}건 (DB에 저장하지 않음)`
      : `DB에 ${total}건을 적재했습니다.`,
    sheets: summary,
  };
}

export async function importExcelFromPayload(body, options = {}) {
  const { filename, buffer } = decodeExcelPayload(body || {});
  const yearHint = yearFromFilename(filename);
  const sheets = parseWorkbook(buffer, { yearHint });
  const loadable = sheets.filter((sheet) => !isSkippedSheet(sheet.name) && sheet.rows.length);
  if (!loadable.length) {
    throw new Error('적재할 축제 행이 없습니다. 조사표의 축제명·시작일·종료일·장소·시군구를 확인하세요.');
  }
  const analysis = analyzeSheets(sheets, { yearHint });
  const result = await persistSheets(sheets, Object.assign({ yearHint }, options));
  return Object.assign({ filename, analysis }, result);
}
