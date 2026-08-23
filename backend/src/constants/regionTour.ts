export interface RegionPreset {
  id: string;
  label: string;
  code: string;
  name: string;
  areaCodes: string[];
  officialMatching: boolean;
}

export const REGION_PRESETS: RegionPreset[] = [
  { id: 'GYEONGGI', label: '경기온', code: '31', name: '경기도', areaCodes: ['31'], officialMatching: true },
  { id: 'SEOUL', label: '서울온', code: '1', name: '서울특별시', areaCodes: ['1'], officialMatching: false },
  { id: 'INCHEON', label: '인천온', code: '2', name: '인천광역시', areaCodes: ['2'], officialMatching: false },
  { id: 'GANGWON', label: '강원온', code: '32', name: '강원특별자치도', areaCodes: ['32'], officialMatching: false },
  { id: 'CHUNGCHEONG', label: '충청온', code: '33', name: '충청권', areaCodes: ['33', '34', '3', '8'], officialMatching: false },
  { id: 'JEOLLA', label: '전라온', code: '35', name: '전라권', areaCodes: ['35', '36', '5'], officialMatching: false },
  { id: 'GYEONGSANG', label: '경상온', code: '37', name: '경상권', areaCodes: ['37', '38', '4', '6', '7'], officialMatching: false },
  { id: 'JEJU', label: '제주온', code: '39', name: '제주특별자치도', areaCodes: ['39'], officialMatching: false },
];

export function regionById(id?: string) {
  return REGION_PRESETS.find((item) => item.id === id || item.code === id) ?? REGION_PRESETS[0];
}

export function regionByAreaCode(areaCode?: string) {
  return REGION_PRESETS.find((item) => item.areaCodes.includes(String(areaCode || ''))) ?? REGION_PRESETS[0];
}

export const ALL_TOUR_AREA_CODES = Array.from(new Set(REGION_PRESETS.flatMap((item) => item.areaCodes)));
