export interface RegionPreset {
  id: string;
  label: string;
  code: string;
  name: string;
  areaCodes: string[];
  officialMatching: boolean;
  moiCode: string;
}

export const LEGACY_METRO_ALIASES: Record<string, string> = {
  CHUNGCHEONG: 'CHUNGNAM',
  JEOLLA: 'JEONBUK',
  GYEONGSANG: 'GYEONGNAM',
};

export function normalizeMetroId(id?: string | null): string {
  const raw = String(id || 'GYEONGGI').toUpperCase();
  return LEGACY_METRO_ALIASES[raw] ?? raw;
}

export const REGION_PRESETS: RegionPreset[] = [
  { id: 'SEOUL', label: '서울온', code: '1', name: '서울특별시', areaCodes: ['1'], officialMatching: false, moiCode: '11' },
  { id: 'BUSAN', label: '부산온', code: '6', name: '부산광역시', areaCodes: ['6'], officialMatching: false, moiCode: '26' },
  { id: 'DAEGU', label: '대구온', code: '4', name: '대구광역시', areaCodes: ['4'], officialMatching: false, moiCode: '27' },
  { id: 'INCHEON', label: '인천온', code: '2', name: '인천광역시', areaCodes: ['2'], officialMatching: false, moiCode: '28' },
  { id: 'GWANGJU', label: '광주온', code: '5', name: '광주광역시', areaCodes: ['5'], officialMatching: false, moiCode: '29' },
  { id: 'DAEJEON', label: '대전온', code: '3', name: '대전광역시', areaCodes: ['3'], officialMatching: false, moiCode: '30' },
  { id: 'ULSAN', label: '울산온', code: '7', name: '울산광역시', areaCodes: ['7'], officialMatching: false, moiCode: '31' },
  { id: 'SEJONG', label: '세종온', code: '8', name: '세종특별자치시', areaCodes: ['8'], officialMatching: false, moiCode: '36' },
  { id: 'GYEONGGI', label: '경기온', code: '31', name: '경기도', areaCodes: ['31'], officialMatching: true, moiCode: '41' },
  { id: 'GANGWON', label: '강원온', code: '32', name: '강원특별자치도', areaCodes: ['32'], officialMatching: false, moiCode: '51' },
  { id: 'CHUNGBUK', label: '충북온', code: '33', name: '충청북도', areaCodes: ['33'], officialMatching: false, moiCode: '43' },
  { id: 'CHUNGNAM', label: '충남온', code: '34', name: '충청남도', areaCodes: ['34'], officialMatching: false, moiCode: '44' },
  { id: 'JEONBUK', label: '전북온', code: '35', name: '전북특별자치도', areaCodes: ['35'], officialMatching: false, moiCode: '52' },
  { id: 'JEONNAM', label: '전남온', code: '36', name: '전라남도', areaCodes: ['36'], officialMatching: false, moiCode: '46' },
  { id: 'GYEONGBUK', label: '경북온', code: '37', name: '경상북도', areaCodes: ['37'], officialMatching: false, moiCode: '47' },
  { id: 'GYEONGNAM', label: '경남온', code: '38', name: '경상남도', areaCodes: ['38'], officialMatching: false, moiCode: '48' },
  { id: 'JEJU', label: '제주온', code: '39', name: '제주특별자치도', areaCodes: ['39'], officialMatching: false, moiCode: '50' },
];

export function regionById(id?: string) {
  const key = normalizeMetroId(id);
  return REGION_PRESETS.find((item) => item.id === key || item.id === id || item.code === id) ?? REGION_PRESETS.find((item) => item.id === 'GYEONGGI')!;
}

export function regionByAreaCode(areaCode?: string) {
  return REGION_PRESETS.find((item) => item.areaCodes.includes(String(areaCode || ''))) ?? REGION_PRESETS.find((item) => item.id === 'GYEONGGI')!;
}

export function regionalZoneFor(areaCode?: string, metro?: string) {
  if (areaCode) return regionByAreaCode(areaCode).id;
  return regionById(metro).id;
}

export const ALL_TOUR_AREA_CODES = REGION_PRESETS.flatMap((item) => item.areaCodes);

/** TourAPI areaCode → 행안부 법정동 광역코드 */
export const AREA_TO_LDONG: Record<string, string> = Object.fromEntries(
  REGION_PRESETS.map((item) => [item.code, item.moiCode]),
);
