const GENERIC_COMPACT_MARKERS = [
  '확인되는대로',
  '추천코스로이을수',
  '의상세개요입니다',
  'tourapi에서수집한',
  '한국관광공사에서수집한',
  '관광공사에서수집한',
  '자동반영됩니다',
  '주최기관안내를따르며',
  '상세정보를불러오는중',
];

export function compactOverviewText(text) {
  return String(text || '').replace(/\s+/g, '').toLowerCase();
}

/** 관광공사 껍데기·대기 문구는 실제 상세 개요가 아니다. */
export function isGenericFestivalOverview(text) {
  const value = String(text || '').trim();
  if (!value) return true;
  const compact = compactOverviewText(value);
  if (GENERIC_COMPACT_MARKERS.some((marker) => compact.includes(marker))) return true;
  if (compact.length <= 36 && /상세개요$/.test(compact) && !/[.。!?]/.test(value)) return true;
  // 장소명·부스명만 있는 한 줄은 상세 개요가 아니다.
  if (compact.length <= 40 && !/[.。!?]/.test(value)) return true;
  return false;
}
