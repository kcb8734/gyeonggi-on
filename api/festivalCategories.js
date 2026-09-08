export const FESTIVAL_CATEGORIES = ['먹거리', '체험', '공연', '문화/예술', '가족', '계절축제', '플리마켓'];

const EXCEL_SOURCES = new Set(['excel', 'survey', 'xlsx', 'mcst']);
const CULTURE_SOURCES = new Set([
  'culture', 'bscf', 'gacf', 'ulsan', 'sjcf', 'jeju', 'gwcf', 'dmgj', 'dcaf', 'dgfca',
  'seoul', 'ggc', 'ifac', 'muni',
]);

export function normalizeFestivalCategory(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw === '문화예술' || raw === '문화 / 예술') return '문화/예술';
  if (FESTIVAL_CATEGORIES.includes(raw)) return raw;
  return '';
}

/** 엑셀 지역축제 → 계절축제, 문화재단 공연·전시·체험은 키워드로 분류. */
export function classifyFestival(title, extra = '') {
  const hay = `${title || ''} ${extra || ''}`;
  if (/플리|마켓|장터|야시장|프리마켓/.test(hay)) return '플리마켓';
  if (/먹거리|음식|맛집|푸드|한우|막걸리|치킨|분식|야식/.test(hay)) return '먹거리';
  if (/공연|콘서트|뮤지컬|오페라|연극|무용|발레|국악|클래식|연주회|리사이틀|음악회|버스킹/.test(hay)) return '공연';
  if (/가족|어린이|키즈|유아|체험학습|어린이날/.test(hay)) return '가족';
  if (/체험|원데이|클래스|만들기|워크숍|워크샵|교육/.test(hay)) return '체험';
  if (/봄|여름|가을|겨울|벚꽃|연꽃|단풍|눈꽃|해바라기|억새|계절/.test(hay)) return '계절축제';
  if (/전시|그림전|사진전|기획전|미술|갤러리|박물관|문학/.test(hay)) return '문화/예술';
  return '문화/예술';
}

export function isExcelFestivalSource(source) {
  return EXCEL_SOURCES.has(String(source || '').toLowerCase());
}

export function isCultureFestivalSource(source) {
  const value = String(source || '').toLowerCase();
  if (CULTURE_SOURCES.has(value)) return true;
  return /culture|재단|bscf|gacf|ulsan|sjcf|jeju|gwcf|dmgj|dcaf|dgfca/.test(value);
}

export function categoryForFestival(item = {}) {
  const source = item.source || item.origin || '';
  if (isExcelFestivalSource(source)) return '계절축제';
  const stored = normalizeFestivalCategory(item.category);
  if (stored) return stored;
  return classifyFestival(item.title, `${item.description || ''} ${item.overview || ''} ${item.extra || ''}`);
}

export function matchesFestivalCategory(item, category) {
  const wanted = normalizeFestivalCategory(category) || String(category || '').trim();
  if (!wanted || wanted === '전체') return true;
  const actual = categoryForFestival(item);
  if (wanted === '계절축제' && (actual === '계절축제' || isExcelFestivalSource(item && item.source))) return true;
  if (wanted === '문화/예술' && (actual === '문화/예술' || actual === '문화예술')) return true;
  return actual === wanted;
}
