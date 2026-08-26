import { METRO_LOCALITIES, METRO_REGIONS, REGION_LABEL, normalizeMetroId } from './regions';

export type CenterStatus = 'selected' | 'reviewing' | 'recruiting';

export interface CenterDirectorProfile {
  name: string;
  title: string;
  phone: string;
  email: string;
  intro: string;
  photoUrl?: string;
}

export interface CenterApplyInput {
  localityKey: string;
  name: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  career: string;
  intro: string;
}

export interface CenterLocalityRow {
  id: string;
  localityId: string;
  label: string;
  region: string;
  regionLabel: string;
  status: CenterStatus;
  director?: CenterDirectorProfile;
}

export interface CenterRegionSummary {
  id: string;
  label: string;
  total: number;
  selected: number;
  reviewing: number;
  recruiting: number;
  covers: string;
}

export const SELECTED_DIRECTORS: Record<string, CenterDirectorProfile> = {
  'GYEONGGI:수원시': {
    name: '박서연',
    title: '경기온 수원 센터장',
    phone: '031-120',
    email: 'suwon@onandon.plus',
    intro: '수원화성 축제와 영동시장 상가를 잇는 현장 센터를 운영합니다.',
  },
  'GYEONGGI:성남시': {
    name: '이준호',
    title: '경기온 성남 센터장',
    phone: '031-120',
    email: 'seongnam@onandon.plus',
    intro: '성남 모란시장과 지역 축제를 상생 쿠폰으로 연결합니다.',
  },
  'GYEONGGI:파주시': {
    name: '최민정',
    title: '경기온 파주 센터장',
    phone: '031-120',
    email: 'paju@onandon.plus',
    intro: '임진각·장단콩 축제와 문산·금촌 시장을 함께 안내합니다.',
  },
  'SEOUL:종로구': {
    name: '김하늘',
    title: '서울온 종로 센터장',
    phone: '02-120',
    email: 'jongno@onandon.plus',
    intro: '광장시장과 종로 거리예술 축제를 잇는 도심 센터입니다.',
  },
  'SEOUL:강남구': {
    name: '정우성',
    title: '서울온 강남 센터장',
    phone: '02-120',
    email: 'gangnam@onandon.plus',
    intro: '강남 축제 현장과 인근 소상공인 할인을 매칭합니다.',
  },
  'BUSAN:부산-해운대구': {
    name: '한지민',
    title: '부산온 해운대 센터장',
    phone: '051-120',
    email: 'haeundae@onandon.plus',
    intro: '해운대 축제와 자갈치·구남로 상권을 연결합니다.',
  },
  'INCHEON:인천-연수구': {
    name: '오세린',
    title: '인천온 연수 센터장',
    phone: '032-120',
    email: 'yeonsu@onandon.plus',
    intro: '송도 축제와 신포시장 먹거리를 안내합니다.',
  },
  'GANGWON:강릉시': {
    name: '윤바다',
    title: '강원온 강릉 센터장',
    phone: '033-120',
    email: 'gangneung@onandon.plus',
    intro: '강릉커피축제와 중앙시장 상가를 함께 소개합니다.',
  },
  'JEONNAM:전남-여수시': {
    name: '문가영',
    title: '전남온 여수 센터장',
    phone: '061-120',
    email: 'yeosu@onandon.plus',
    intro: '여수밤바다 축제와 교동시장을 잇습니다.',
  },
  'JEJU:제주시': {
    name: '고은섬',
    title: '제주온 제주 센터장',
    phone: '064-120',
    email: 'jeju@onandon.plus',
    intro: '들불축제와 동문시장 상생 쿠폰을 현장 안내합니다.',
  },
};

export const SEED_REVIEWING = new Set([
  'GYEONGGI:용인시',
  'GYEONGGI:고양시',
  'SEOUL:마포구',
  'BUSAN:부산-중구',
  'DAEGU:대구-수성구',
  'GWANGJU:광주-동구',
  'CHUNGNAM:충남-보령시',
  'GYEONGNAM:경남-통영시',
]);

export function localityKey(region: string, localityId: string) {
  return `${normalizeMetroId(region)}:${localityId}`;
}

function statusFor(key: string, extraReviewing: string[] = []): CenterStatus {
  if (SELECTED_DIRECTORS[key]) return 'selected';
  if (extraReviewing.includes(key) || SEED_REVIEWING.has(key)) return 'reviewing';
  return 'recruiting';
}

export function listCenterLocalities(region?: string, extraReviewing: string[] = []): CenterLocalityRow[] {
  const keys = region ? [normalizeMetroId(region)] : Object.keys(METRO_LOCALITIES);
  return keys.flatMap((metro) => {
    const label = REGION_LABEL[metro] ?? metro;
    return (METRO_LOCALITIES[metro] ?? []).map((loc) => {
      const id = localityKey(metro, loc.id);
      const status = statusFor(id, extraReviewing);
      return {
        id,
        localityId: loc.id,
        label: loc.label,
        region: metro,
        regionLabel: label,
        status,
        director: status === 'selected' ? SELECTED_DIRECTORS[id] : undefined,
      };
    });
  });
}

export function summarizeCenterRegions(extraReviewing: string[] = []): CenterRegionSummary[] {
  return METRO_REGIONS.map((metro) => {
    const rows = listCenterLocalities(metro.id, extraReviewing);
    return {
      id: metro.id,
      label: metro.label,
      total: rows.length,
      selected: rows.filter((row) => row.status === 'selected').length,
      reviewing: rows.filter((row) => row.status === 'reviewing').length,
      recruiting: rows.filter((row) => row.status === 'recruiting').length,
      covers: metro.covers,
    };
  });
}
