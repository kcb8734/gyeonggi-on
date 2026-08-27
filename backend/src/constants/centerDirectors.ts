import { METRO_LOCALITIES, REGION_META, normalizeMetroId } from './metroLocalities';

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

const GOV_NAME: Record<string, string> = {
  SEOUL: '서울특별시',
  BUSAN: '부산광역시',
  DAEGU: '대구광역시',
  INCHEON: '인천광역시',
  GWANGJU: '광주광역시',
  DAEJEON: '대전광역시',
  ULSAN: '울산광역시',
  SEJONG: '세종특별자치시',
  GYEONGGI: '경기도',
  GANGWON: '강원특별자치도',
  CHUNGBUK: '충청북도',
  CHUNGNAM: '충청남도',
  JEONBUK: '전북특별자치도',
  JEONNAM: '전라남도',
  GYEONGBUK: '경상북도',
  GYEONGNAM: '경상남도',
  JEJU: '제주특별자치도',
};

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

function shortLocalityName(label: string) {
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

const SELECTED_SEED: Record<string, CenterDirectorProfile> = {
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

export const SELECTED_DIRECTORS: Record<string, CenterDirectorProfile> = { ...SELECTED_SEED };

const SEED_REVIEWING = new Set([
  'GYEONGGI:용인시',
  'GYEONGGI:고양시',
  'SEOUL:마포구',
  'BUSAN:부산-중구',
  'DAEGU:대구-수성구',
  'GWANGJU:광주-동구',
  'CHUNGNAM:충남-보령시',
  'GYEONGNAM:경남-통영시',
]);

const applications: CenterApplicationRecord[] = [];
const localityReview = new Map<string, CenterStatus>();

function cloneProfile(profile: CenterDirectorProfile): CenterDirectorProfile {
  return { ...profile };
}

export function localityKey(region: string, localityId: string) {
  return `${normalizeMetroId(region)}:${localityId}`;
}

function localityMeta(key: string) {
  const [regionRaw, ...rest] = String(key).split(':');
  const region = normalizeMetroId(regionRaw);
  const localityId = rest.join(':');
  const loc = (METRO_LOCALITIES[region] ?? []).find((row) => row.id === localityId);
  return {
    region,
    localityId,
    label: loc?.label ?? localityId,
    regionLabel: REGION_META[region]?.label ?? region,
  };
}

function nextId() {
  return `APP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function resetCenterDirectorState() {
  applications.splice(0, applications.length);
  localityReview.clear();
  Object.keys(SELECTED_DIRECTORS).forEach((key) => {
    delete SELECTED_DIRECTORS[key];
  });
  Object.entries(SELECTED_SEED).forEach(([key, profile]) => {
    SELECTED_DIRECTORS[key] = cloneProfile(profile);
  });
}

export function applyCenterDirector(input: CenterApplyInput): { ok: true; data: CenterApplicationRecord } | { ok: false; message: string } {
  const name = String(input.name || '').trim();
  const age = String(input.age || '').trim();
  const phone = String(input.phone || '').trim();
  const address = String(input.address || '').trim();
  const career = String(input.career || '').trim();
  const intro = String(input.intro || '').trim();
  const key = String(input.localityKey || '');
  if (!key || !name || !age || !phone || !address || !career || !intro) {
    return { ok: false, message: '이름, 나이, 연락처, 활동 주소, 경력, 자기소개를 모두 입력해 주세요.' };
  }
  if (SELECTED_DIRECTORS[key] || localityReview.get(key) === 'selected') {
    return { ok: false, message: '이미 센터장이 선정된 지역입니다.' };
  }
  const meta = localityMeta(key);
  const row: CenterApplicationRecord = {
    id: input.id || nextId(),
    localityKey: key,
    name,
    age,
    phone,
    email: String(input.email || '').trim(),
    address,
    photoUrl: input.photoUrl,
    career,
    intro,
    submittedAt: new Date().toISOString(),
    reviewStatus: 'submitted',
    cardApplied: false,
    localityLabel: meta.label,
    region: meta.region,
    regionLabel: meta.regionLabel,
  };
  applications.push(row);
  return { ok: true, data: row };
}

export function listApplications() {
  return applications.map((row) => ({ ...row }));
}

export function hydrateApplications(rows: CenterApplicationRecord[]) {
  rows.forEach((row) => {
    if (!row?.localityKey || !row?.id) return;
    const index = applications.findIndex((item) => item.id === row.id);
    if (index >= 0) applications[index] = { ...applications[index], ...row };
    else applications.push({ ...row });
  });
}

export function reviewApplication(id: string, status: CenterReviewStatus): { ok: true; data: CenterApplicationRecord } | { ok: false; message: string } {
  if (status !== 'submitted' && status !== 'reviewing' && status !== 'selected') {
    return { ok: false, message: '지원완료(선정 심사 중) 또는 선정 완료만 지정할 수 있습니다.' };
  }
  const row = applications.find((item) => item.id === id);
  if (!row) return { ok: false, message: '지원서를 찾을 수 없습니다.' };
  row.reviewStatus = status;
  if (status === 'reviewing') {
    if (localityReview.get(row.localityKey) !== 'selected') {
      localityReview.set(row.localityKey, 'reviewing');
    }
  }
  if (status === 'selected') {
    localityReview.set(row.localityKey, 'selected');
    const meta = localityMeta(row.localityKey);
    SELECTED_DIRECTORS[row.localityKey] = {
      name: row.name,
      title: directorTitleFor(meta.regionLabel, meta.label),
      phone: row.phone,
      email: row.email || `${localityWebSlug(meta.label)}@kdanji.com`,
      intro: row.intro,
      photoUrl: row.photoUrl,
      address: row.address,
      website: websiteForLocality(meta.label),
      age: row.age,
    };
  }
  return { ok: true, data: { ...row } };
}

export function applyBusinessCard(id: string): { ok: true; data: CenterApplicationRecord } | { ok: false; message: string } {
  const row = applications.find((item) => item.id === id);
  if (!row) return { ok: false, message: '지원서를 찾을 수 없습니다.' };
  const meta = localityMeta(row.localityKey);
  row.cardApplied = true;
  row.reviewStatus = 'selected';
  localityReview.set(row.localityKey, 'selected');
  SELECTED_DIRECTORS[row.localityKey] = {
    name: row.name,
    title: directorTitleFor(meta.regionLabel, meta.label),
    phone: row.phone,
    email: row.email || `${localityWebSlug(meta.label)}@kdanji.com`,
    intro: row.intro,
    photoUrl: row.photoUrl,
    address: row.address,
    website: websiteForLocality(meta.label),
    age: row.age,
  };
  return { ok: true, data: { ...row } };
}

function applicantCountFor(key: string) {
  const live = applications.filter((row) => row.localityKey === key).length;
  if (SEED_REVIEWING.has(key)) return Math.max(live, 1);
  return live;
}

function statusFor(key: string): CenterStatus {
  if (SELECTED_DIRECTORS[key] || localityReview.get(key) === 'selected') return 'selected';
  if (localityReview.get(key) === 'reviewing' || SEED_REVIEWING.has(key)) return 'reviewing';
  if (applications.some((row) => row.localityKey === key && row.reviewStatus === 'reviewing')) return 'reviewing';
  return 'recruiting';
}

export function listCenterLocalities(region?: string): CenterLocalityRow[] {
  const keys = region ? [normalizeMetroId(region)] : Object.keys(METRO_LOCALITIES);
  return keys.flatMap((metro) => {
    const meta = REGION_META[metro];
    return (METRO_LOCALITIES[metro] ?? []).map((loc) => {
      const id = localityKey(metro, loc.id);
      const status = statusFor(id);
      return {
        id,
        localityId: loc.id,
        label: loc.label,
        region: metro,
        regionLabel: meta?.label ?? metro,
        status,
        applicantCount: applicantCountFor(id),
        director: status === 'selected' ? SELECTED_DIRECTORS[id] : undefined,
      };
    });
  });
}

export function summarizeCenterRegions(): CenterRegionSummary[] {
  return Object.keys(METRO_LOCALITIES).map((metro) => {
    const rows = listCenterLocalities(metro);
    const meta = REGION_META[metro];
    return {
      id: metro,
      label: meta?.label ?? metro,
      total: rows.length,
      selected: rows.filter((row) => row.status === 'selected').length,
      reviewing: rows.filter((row) => row.status === 'reviewing').length,
      recruiting: rows.filter((row) => row.status === 'recruiting').length,
      covers: `${rows.length}개 시·군·구`,
    };
  });
}
