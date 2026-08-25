/** 지자체(시·군·구)별 할인율 칸 색. 같은 지자체 쿠폰이 한눈에 구분되도록 고정한다. */
import { normalizeMetroId } from '../constants/regions';

export const METRO_RATE_COLORS: Record<string, string> = {
  GYEONGGI: '#E0392A',
  SEOUL: '#2563EB',
  INCHEON: '#0D9488',
  GANGWON: '#059669',
  CHUNGBUK: '#D97706',
  CHUNGNAM: '#B45309',
  DAEJEON: '#CA8A04',
  SEJONG: '#A16207',
  JEONBUK: '#7C3AED',
  JEONNAM: '#6D28D9',
  GWANGJU: '#5B21B6',
  GYEONGBUK: '#DB2777',
  GYEONGNAM: '#BE185D',
  BUSAN: '#9D174D',
  DAEGU: '#E11D48',
  ULSAN: '#F43F5E',
  JEJU: '#EA580C',
  CHUNGCHEONG: '#D97706',
  JEOLLA: '#7C3AED',
  GYEONGSANG: '#DB2777',
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
  { token: '춘천', color: '#047857' },
  { token: '강릉', color: '#0F766E' },
  { token: '평창', color: '#15803D' },
  { token: '속초', color: '#0369A1' },
  { token: '강화', color: '#0D9488' },
  { token: '연수', color: '#0F766E' },
  { token: '청주', color: '#D97706' },
  { token: '보령', color: '#B45309' },
  { token: '부여', color: '#CA8A04' },
  { token: '전주', color: '#7C3AED' },
  { token: '여수', color: '#6D28D9' },
  { token: '순천', color: '#5B21B6' },
  { token: '진주', color: '#DB2777' },
  { token: '경주', color: '#BE185D' },
  { token: '부산', color: '#9D174D' },
  { token: '서귀포', color: '#C2410C' },
];

export function couponRateColor(source?: string | null, metro?: string | null): string {
  const hay = source ?? '';
  const found = LOCALITY_RATE_COLORS.find((item) => hay.includes(item.token));
  if (found) return found.color;
  return METRO_RATE_COLORS[normalizeMetroId(metro ?? 'GYEONGGI')] ?? '#E0392A';
}
