/** 지자체(시·군·구)별 할인율 칸 색. 같은 지자체 쿠폰이 한눈에 구분되도록 고정한다. */
export const METRO_RATE_COLORS: Record<string, string> = {
  GYEONGGI: '#E0392A',
  SEOUL: '#2563EB',
  INCHEON: '#0D9488',
  GANGWON: '#059669',
  CHUNGCHEONG: '#D97706',
  JEOLLA: '#7C3AED',
  GYEONGSANG: '#DB2777',
  JEJU: '#EA580C',
};

const LOCALITY_RATE_COLORS: Array<{ token: string; color: string }> = [
  { token: '수원', color: '#E0392A' },
  { token: '용인', color: '#EA580C' },
  { token: '가평', color: '#2563EB' },
  { token: '고양', color: '#059669' },
  { token: '성남', color: '#7C3AED' },
  { token: '화성', color: '#0F766E' },
  { token: '부천', color: '#DB2777' },
  { token: '남양주', color: '#CA8A04' },
  { token: '안산', color: '#0284C7' },
  { token: '안양', color: '#4F46E5' },
  { token: '평택', color: '#B45309' },
  { token: '시흥', color: '#0D9488' },
  { token: '파주', color: '#15803D' },
  { token: '김포', color: '#BE185D' },
  { token: '의정부', color: '#1D4ED8' },
  { token: '광주', color: '#9333EA' },
  { token: '하남', color: '#C2410C' },
  { token: '서울', color: '#2563EB' },
  { token: '인천', color: '#0F766E' },
  { token: '강원', color: '#047857' },
  { token: '제주', color: '#EA580C' },
];

export function couponRateColor(source?: string | null, metro?: string | null): string {
  const hay = source ?? '';
  const found = LOCALITY_RATE_COLORS.find((item) => hay.includes(item.token));
  if (found) return found.color;
  return METRO_RATE_COLORS[metro ?? 'GYEONGGI'] ?? '#E0392A';
}
