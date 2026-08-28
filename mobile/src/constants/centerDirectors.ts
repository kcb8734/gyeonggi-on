import { METRO_LOCALITIES, METRO_REGIONS, REGION_LABEL, normalizeMetroId } from './regions';

export type CenterStatus = 'selected' | 'reviewing' | 'recruiting';
export type CenterReviewStatus = 'submitted' | 'reviewing' | 'selected';

export interface CenterDirectorProfile {
  name: string;
  title: string;
  phone: string;
  email: string;
  intro: string;
  photoUrl?: string;
  address?: string;
  website?: string;
  age?: string;
}

export interface CenterApplyInput {
  id?: string;
  localityKey: string;
  name: string;
  age?: string;
  phone: string;
  email?: string;
  address?: string;
  photoUrl?: string;
  career: string;
  intro: string;
}

export interface CenterApplicationRecord extends CenterApplyInput {
  id: string;
  submittedAt: string;
  reviewStatus: CenterReviewStatus;
  cardApplied: boolean;
  localityLabel?: string;
  region?: string;
  regionLabel?: string;
}

export interface CenterLocalityRow {
  id: string;
  localityId: string;
  label: string;
  region: string;
  regionLabel: string;
  status: CenterStatus;
  applicantCount: number;
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

export interface CenterOverlay {
  reviewingKeys?: string[];
  applications?: CenterApplicationRecord[];
  directors?: Record<string, CenterDirectorProfile>;
  localityStatus?: Record<string, CenterStatus>;
}

const GOV_NAME: Record<string, string> = Object.fromEntries(
  METRO_REGIONS.map((region) => [region.id, region.governments[0] || region.label]),
);

const SLUG_OVERRIDES: Record<string, string> = {
  춘천: 'chuncheon',
  수원: 'suwon',
  성남: 'seongnam',
  파주: 'paju',
  용인: 'yongin',
  고양: 'goyang',
  종로: 'jongno',
  강남: 'gangnam',
  마포: 'mapo',
  해운대: 'haeundae',
  연수: 'yeonsu',
  강릉: 'gangneung',
  여수: 'yeosu',
  제주: 'jeju',
  보령: 'boryeong',
  통영: 'tongyeong',
  수성: 'suseong',
  동구: 'donggu',
  중구: 'junggu',
};

export function shortLocalityName(label: string) {
  return String(label || '')
    .replace(/^(서울|부산|대구|인천|광주|대전|울산)\s+/, '')
    .replace(/(특별자치시|광역시|특별시)$/, '')
    .replace(/(시|군|구)$/, '')
    .trim();
}

function romanizeHangul(text: string) {
  const INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
  const MEDIAL = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
  const FINAL = ['', 'g', 'kk', 'gs', 'n', 'nj', 'nh', 'd', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'];
  return [...text].map((ch) => {
    const code = ch.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) return ch;
    const seq = code - 0xac00;
    const i = Math.floor(seq / 588);
    const m = Math.floor((seq % 588) / 28);
    const f = seq % 28;
    return `${INITIAL[i]}${MEDIAL[m]}${FINAL[f]}`;
  }).join('');
}

export function localityWebSlug(label: string) {
  const short = shortLocalityName(label);
  return SLUG_OVERRIDES[short] || romanizeHangul(short).toLowerCase().replace(/[^a-z0-9]+/g, '') || 'center';
}

export function findLocalityByWebSlug(slug: string): CenterLocalityRow | null {
  const needle = String(slug || '').replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!needle) return null;
  return listCenterLocalities().find((row) => localityWebSlug(row.label) === needle) ?? null;
}

export function dedicatedCenterName(region: string, label: string) {
  const gov = GOV_NAME[normalizeMetroId(region)] || '';
  return `${gov} ${shortLocalityName(label)} 전담센터`.trim();
}

export function directorTitleFor(regionLabel: string, label: string) {
  return `${regionLabel} ${shortLocalityName(label)}센터장`;
}

export function websiteForLocality(label: string) {
  return `kdanji.com/${localityWebSlug(label)}`;
}

export function qrUrlForLocality(label: string) {
  return `https://www.kdanji.com/${localityWebSlug(label)}`;
}

export const SELECTED_DIRECTORS: Record<string, CenterDirectorProfile> = {
  'GYEONGGI:수원시': {
    name: '박서연',
    title: '경기온 수원 센터장',
    phone: '031-120',
    email: 'suwon@kdanji.com',
    intro: '수원화성 축제와 영동시장 상가를 잇는 현장 센터를 운영합니다.',
    address: '경기도 수원시 팔달구 정조로 825',
    website: 'kdanji.com/suwon',
  },
  'GYEONGGI:성남시': {
    name: '이준호',
    title: '경기온 성남 센터장',
    phone: '031-120',
    email: 'seongnam@kdanji.com',
    intro: '성남 모란시장과 지역 축제를 상생 쿠폰으로 연결합니다.',
    address: '경기도 성남시 수정구 산성대로 277',
    website: 'kdanji.com/seongnam',
  },
  'GYEONGGI:파주시': {
    name: '최민정',
    title: '경기온 파주 센터장',
    phone: '031-120',
    email: 'paju@kdanji.com',
    intro: '임진각·장단콩 축제와 문산·금촌 시장을 함께 안내합니다.',
    address: '경기도 파주시 시청로 50',
    website: 'kdanji.com/paju',
  },
  'SEOUL:종로구': {
    name: '김하늘',
    title: '서울온 종로 센터장',
    phone: '02-120',
    email: 'jongno@kdanji.com',
    intro: '광장시장과 종로 거리예술 축제를 잇는 도심 센터입니다.',
    address: '서울특별시 종로구 종로 1',
    website: 'kdanji.com/jongno',
  },
  'SEOUL:강남구': {
    name: '정우성',
    title: '서울온 강남 센터장',
    phone: '02-120',
    email: 'gangnam@kdanji.com',
    intro: '강남 축제 현장과 인근 소상공인 할인을 매칭합니다.',
    address: '서울특별시 강남구 강남대로 396',
    website: 'kdanji.com/gangnam',
  },
  'BUSAN:부산-해운대구': {
    name: '한지민',
    title: '부산온 해운대 센터장',
    phone: '051-120',
    email: 'haeundae@kdanji.com',
    intro: '해운대 축제와 자갈치·구남로 상권을 연결합니다.',
    address: '부산광역시 해운대구 해운대로 620',
    website: 'kdanji.com/haeundae',
  },
  'INCHEON:인천-연수구': {
    name: '오세린',
    title: '인천온 연수 센터장',
    phone: '032-120',
    email: 'yeonsu@kdanji.com',
    intro: '송도 축제와 신포시장 먹거리를 안내합니다.',
    address: '인천광역시 연수구 원인재로 115',
    website: 'kdanji.com/yeonsu',
  },
  'GANGWON:강릉시': {
    name: '윤바다',
    title: '강원온 강릉 센터장',
    phone: '033-120',
    email: 'gangneung@kdanji.com',
    intro: '강릉커피축제와 중앙시장 상가를 함께 소개합니다.',
    address: '강원특별자치도 강릉시 강릉대로 33',
    website: 'kdanji.com/gangneung',
  },
  'JEONNAM:전남-여수시': {
    name: '문가영',
    title: '전남온 여수 센터장',
    phone: '061-120',
    email: 'yeosu@kdanji.com',
    intro: '여수밤바다 축제와 교동시장을 잇습니다.',
    address: '전라남도 여수시 시청로 1',
    website: 'kdanji.com/yeosu',
  },
  'JEJU:제주시': {
    name: '고은섬',
    title: '제주온 제주 센터장',
    phone: '064-120',
    email: 'jeju@kdanji.com',
    intro: '들불축제와 동문시장 상생 쿠폰을 현장 안내합니다.',
    address: '제주특별자치도 제주시 문연로 6',
    website: 'kdanji.com/jeju',
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

function overlayOf(extra?: string[] | CenterOverlay): CenterOverlay {
  if (Array.isArray(extra)) return { reviewingKeys: extra };
  return extra ?? {};
}

function statusFor(key: string, overlay: CenterOverlay = {}): CenterStatus {
  const forced = overlay.localityStatus?.[key];
  if (forced === 'recruiting' || forced === 'reviewing' || forced === 'selected') return forced;
  if (overlay.directors?.[key] || SELECTED_DIRECTORS[key]) return 'selected';
  if (overlay.applications?.some((row) => row.localityKey === key && row.reviewStatus === 'selected')) return 'selected';
  if (overlay.reviewingKeys?.includes(key) || SEED_REVIEWING.has(key)) return 'reviewing';
  if (overlay.applications?.some((row) => row.localityKey === key && row.reviewStatus === 'reviewing')) return 'reviewing';
  return 'recruiting';
}

function applicantCountFor(key: string, overlay: CenterOverlay = {}) {
  const live = overlay.applications?.filter((row) => row.localityKey === key).length ?? 0;
  if (SEED_REVIEWING.has(key)) return Math.max(live, 1);
  return live;
}

export function listCenterLocalities(region?: string, extra: string[] | CenterOverlay = []): CenterLocalityRow[] {
  const overlay = overlayOf(extra);
  const keys = region ? [normalizeMetroId(region)] : Object.keys(METRO_LOCALITIES);
  return keys.flatMap((metro) => {
    const label = REGION_LABEL[metro] ?? metro;
    return (METRO_LOCALITIES[metro] ?? []).map((loc) => {
      const id = localityKey(metro, loc.id);
      const status = statusFor(id, overlay);
      return {
        id,
        localityId: loc.id,
        label: loc.label,
        region: metro,
        regionLabel: label,
        status,
        applicantCount: applicantCountFor(id, overlay),
        director: status === 'selected' ? (overlay.directors?.[id] || SELECTED_DIRECTORS[id]) : undefined,
      };
    });
  });
}

export function summarizeCenterRegions(extra: string[] | CenterOverlay = []): CenterRegionSummary[] {
  return METRO_REGIONS.map((metro) => {
    const rows = listCenterLocalities(metro.id, extra);
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

export function overlayLocalities(rows: CenterLocalityRow[], extra: CenterOverlay): CenterLocalityRow[] {
  return rows.map((row) => {
    const status = statusFor(row.id, extra);
    const count = Math.max(row.applicantCount ?? 0, applicantCountFor(row.id, extra));
    return {
      ...row,
      status,
      applicantCount: count,
      director: status === 'selected' ? (extra.directors?.[row.id] || row.director || SELECTED_DIRECTORS[row.id]) : undefined,
    };
  });
}

export function overlayRegions(rows: CenterRegionSummary[], extra: CenterOverlay): CenterRegionSummary[] {
  const local = summarizeCenterRegions(extra);
  return (rows.length ? rows : local).map((row) => {
    const overlay = local.find((item) => item.id === row.id);
    if (!overlay) return row;
    return {
      ...row,
      selected: overlay.selected,
      reviewing: overlay.reviewing,
      recruiting: overlay.recruiting,
    };
  });
}
