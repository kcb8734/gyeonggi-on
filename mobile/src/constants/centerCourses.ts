import type { FestivalCourse } from '../api/courses';

export type CenterCourseStop = {
  name: string;
  description: string;
  latitude?: number;
  longitude?: number;
};

export type CenterCourseStatus = 'pending' | 'approved' | 'revision' | 'rejected';

export type CenterLocalCourse = {
  id: string;
  regionId: string;
  metro?: string;
  centerId: string;
  title: string;
  description: string;
  images: string[];
  historyCourse: CenterCourseStop;
  marketFoodCourse: CenterCourseStop;
  mainAxis: CenterCourseStop;
  campingAccommodation: CenterCourseStop;
  status: CenterCourseStatus;
  updatedAt: string;
};

export type CenterCourseInput = Omit<CenterLocalCourse, 'id' | 'updatedAt' | 'status'> & { id?: string; status?: CenterCourseStatus };

const COURSES: CenterLocalCourse[] = [
  {
    id: 'course-suwon-seed',
    regionId: '수원시',
    metro: 'GYEONGGI',
    centerId: 'GYEONGGI:수원시',
    title: '수원화성 행궁·시장·캠핑 하루 코스',
    description: '수원 센터장이 현장 동선으로 묶은 역사·시장·축제·숙박 코스입니다.',
    images: [],
    historyCourse: {
      name: '수원화성 · 화성행궁',
      description: '유네스코 성곽과 행궁을 먼저 걷고 축제장으로 이어집니다.',
      latitude: 37.2819,
      longitude: 127.0139,
    },
    marketFoodCourse: {
      name: '수원 영동시장',
      description: '갈비·통닭 골목에서 먹거리를 즐깁니다. On&On+ 쿠폰은 추후 준비 중입니다.',
      latitude: 37.2786,
      longitude: 127.0168,
    },
    mainAxis: {
      name: '수원화성문화제',
      description: '행궁광장 메인 축제 동선입니다.',
      latitude: 37.287,
      longitude: 127.013,
    },
    campingAccommodation: {
      name: '광교호수공원 가족캠핑장',
      description: '광교호수 옆에서 하룻밤 머물며 다음 날 시장 브런치를 이어갑니다.',
      latitude: 37.283,
      longitude: 127.065,
    },
    status: 'approved',
    updatedAt: new Date().toISOString(),
  },
];

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeCenterCourses(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function regionToken(value: string) {
  return String(value || '').replace(/(특별자치시|광역시|특별시|시|군|구)$/, '').trim();
}

function sameRegion(left: string, right: string) {
  if (!left || !right) return false;
  if (left === right) return true;
  const a = regionToken(left);
  const b = regionToken(right);
  return Boolean(a && b && (left.includes(b) || right.includes(a) || a === b));
}

export function listCenterCourses(
  regionId?: string,
  metro?: string,
  status: CenterCourseStatus | 'all' = 'approved',
) {
  return COURSES.filter((item) => {
    if (regionId && !sameRegion(item.regionId, regionId)) return false;
    if (metro && item.metro && item.metro !== metro) return false;
    if (status !== 'all' && item.status !== status) return false;
    return true;
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listPendingCenterCourses() {
  return COURSES.filter((item) => item.status !== 'approved').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listAllCenterCourses() {
  return listCenterCourses(undefined, undefined, 'all');
}

export function reviewCenterCourse(id: string, status: CenterCourseStatus): CenterLocalCourse | null {
  const existing = COURSES.find((item) => item.id === id);
  if (!existing) return null;
  existing.status = status;
  existing.updatedAt = new Date().toISOString();
  notify();
  return existing;
}

export function findCenterCourseForPlace(input: { city?: string; address?: string; title?: string; metro?: string }) {
  const hay = `${input.city || ''} ${input.address || ''} ${input.title || ''}`;
  const ranked = COURSES.filter((item) => {
    if (item.status !== 'approved') return false;
    if (input.metro && item.metro && item.metro !== input.metro) return false;
    const token = regionToken(item.regionId);
    return hay.includes(item.regionId) || (token.length >= 2 && hay.includes(token));
  });
  return ranked.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export function hydrateCenterCourses(rows: CenterLocalCourse[]) {
  for (const row of rows) {
    if (!row?.regionId || !row?.title) continue;
    const existing = COURSES.find((item) => item.id === row.id || (item.regionId === row.regionId && item.centerId === row.centerId));
    if (existing) Object.assign(existing, row);
    else COURSES.unshift(row);
  }
  notify();
}

export function upsertCenterCourse(input: CenterCourseInput): CenterLocalCourse {
  const regionId = String(input.regionId || '').trim();
  const title = String(input.title || '').trim();
  if (!regionId || !title) {
    throw new Error('지역과 코스 제목을 입력해 주세요.');
  }
  const now = new Date().toISOString();
  const existing = COURSES.find((item) =>
    (input.id && item.id === input.id) || (item.regionId === regionId && item.centerId === input.centerId),
  );
  const next: CenterLocalCourse = {
    id: existing?.id || input.id || `course-${Date.now()}`,
    regionId,
    metro: input.metro,
    centerId: String(input.centerId || regionId),
    title,
    description: String(input.description || '').trim(),
    images: (input.images || []).map((url) => String(url || '').trim()).filter(Boolean),
    historyCourse: normalizeStop(input.historyCourse),
    marketFoodCourse: normalizeStop(input.marketFoodCourse),
    mainAxis: normalizeStop(input.mainAxis),
    campingAccommodation: normalizeStop(input.campingAccommodation),
    status: 'pending',
    updatedAt: now,
  };
  if (existing) {
    Object.assign(existing, next);
    notify();
    return existing;
  }
  COURSES.unshift(next);
  notify();
  return next;
}

export function approveCenterCourse(id: string): CenterLocalCourse | null {
  return reviewCenterCourse(id, 'approved');
}

function normalizeStop(stop?: CenterCourseStop): CenterCourseStop {
  return {
    name: String(stop?.name || '').trim(),
    description: String(stop?.description || '').trim(),
    latitude: Number.isFinite(Number(stop?.latitude)) ? Number(stop?.latitude) : undefined,
    longitude: Number.isFinite(Number(stop?.longitude)) ? Number(stop?.longitude) : undefined,
  };
}

export function centerCourseToFestivalCourse(course: CenterLocalCourse): FestivalCourse {
  const stops: Array<{ step: number; category: string; stop: CenterCourseStop; time: string }> = [
    { step: 1, category: '역사체험', stop: course.historyCourse, time: '1시간 30분' },
    { step: 2, category: '전통시장 먹거리', stop: course.marketFoodCourse, time: '1시간' },
    { step: 3, category: '메인 축제', stop: course.mainAxis, time: '3시간' },
    { step: 4, category: '캠핑장/숙박', stop: course.campingAccommodation, time: '숙박' },
  ];
  return {
    course_title: `[${course.regionId}] ${course.title}`,
    target_audience: '가족 · 연인 · 캠핑을 즐기는 2030 여행객',
    total_distance: '4~15km',
    itinerary: stops.map((item) => ({
      step: item.step,
      category: item.category,
      place_name: item.stop.name || `${course.regionId} 코스 ${item.step}`,
      description: item.stop.description || course.description,
      estimated_time: item.time,
      latitude: item.stop.latitude,
      longitude: item.stop.longitude,
    })),
    local_benefit_tip: course.description || '지역 센터장이 현장에서 발굴한 추천 코스입니다.',
  };
}
