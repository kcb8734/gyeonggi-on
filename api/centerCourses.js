/** Vercel /api 센터장 추천 코스. 기존 api/index.js 라우트에 붙여 함수 수를 늘리지 않는다. */

function regionToken(value) {
  return String(value || '').replace(/(특별자치시|광역시|특별시|시|군|구)$/, '').trim();
}

function sameRegion(left, right) {
  if (!left || !right) return false;
  if (left === right) return true;
  const a = regionToken(left);
  const b = regionToken(right);
  return Boolean(a && b && (left.includes(b) || right.includes(a) || a === b));
}

function normalizeStop(stop) {
  return {
    name: String(stop?.name || '').trim(),
    description: String(stop?.description || '').trim(),
    latitude: Number.isFinite(Number(stop?.latitude)) ? Number(stop.latitude) : undefined,
    longitude: Number.isFinite(Number(stop?.longitude)) ? Number(stop.longitude) : undefined,
  };
}

function fnv1a(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashCoursePassword(password) {
  const salt = `onandon+course|${String(password || '')}`;
  return `${fnv1a(salt)}${fnv1a([...salt].reverse().join(''))}`;
}

const PASSWORDS = {};

export function hasCoursePassword(centerId) {
  return Boolean(PASSWORDS[String(centerId || '')]);
}

export function registerCoursePassword(centerId, password, confirm) {
  const id = String(centerId || '').trim();
  const pw = String(password || '').trim();
  if (!id) return { ok: false, message: '지역을 확인할 수 없습니다.' };
  if (pw.length < 4) return { ok: false, message: '비밀번호는 4자 이상이어야 합니다.' };
  if (pw !== String(confirm || '').trim()) return { ok: false, message: '비밀번호 확인이 일치하지 않습니다.' };
  if (hasCoursePassword(id)) return { ok: false, message: '이미 등록된 비밀번호가 있습니다.' };
  PASSWORDS[id] = hashCoursePassword(pw);
  return { ok: true, hasPassword: true };
}

export function verifyCoursePassword(centerId, password) {
  const id = String(centerId || '').trim();
  const saved = PASSWORDS[id];
  if (!saved) return { ok: false, message: '등록된 비밀번호가 없습니다. 먼저 등록해 주세요.' };
  if (saved !== hashCoursePassword(password)) return { ok: false, message: '비밀번호가 올바르지 않습니다.' };
  return { ok: true, hasPassword: true };
}

export function changeCoursePassword(centerId, current, next, confirm) {
  const check = verifyCoursePassword(centerId, current);
  if (!check.ok) return check;
  const pw = String(next || '').trim();
  if (pw.length < 4) return { ok: false, message: '새 비밀번호는 4자 이상이어야 합니다.' };
  if (pw !== String(confirm || '').trim()) return { ok: false, message: '새 비밀번호 확인이 일치하지 않습니다.' };
  PASSWORDS[String(centerId || '').trim()] = hashCoursePassword(pw);
  return { ok: true, hasPassword: true };
}

export function resetCoursePassword(centerId) {
  const id = String(centerId || '').trim();
  if (!id) return { ok: false, message: '지역을 확인할 수 없습니다.' };
  delete PASSWORDS[id];
  return { ok: true, hasPassword: false };
}

export function courseAuth(body) {
  const mode = String(body?.mode || '').trim();
  const centerId = String(body?.centerId || '').trim();
  if (!centerId) return { ok: false, message: '지역을 확인할 수 없습니다.' };
  if (mode === 'register') return registerCoursePassword(centerId, body.password, body.confirm);
  if (mode === 'login') return verifyCoursePassword(centerId, body.password);
  if (mode === 'change') return changeCoursePassword(centerId, body.currentPassword, body.nextPassword, body.confirm);
  return { ok: false, message: '비밀번호 요청을 확인할 수 없습니다.' };
}

const COURSES = [
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

export function listCenterCourses(regionId, metro, review) {
  return COURSES.filter((item) => {
    if (regionId && !sameRegion(item.regionId, regionId)) return false;
    if (metro && item.metro && item.metro !== metro) return false;
    if (!review && item.status !== 'approved') return false;
    return true;
  }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function listPendingCenterCourses() {
  return COURSES.filter((item) => item.status !== 'approved')
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function reviewCenterCourse(id, status) {
  const allowed = { pending: 1, approved: 1, revision: 1, rejected: 1 };
  const existing = COURSES.find((item) => item.id === id);
  if (!existing) return { ok: false, message: '코스를 찾을 수 없습니다.' };
  if (!allowed[status]) return { ok: false, message: '검토 상태를 확인할 수 없습니다.' };
  existing.status = status;
  existing.updatedAt = new Date().toISOString();
  return { ok: true, data: existing };
}

export function approveCenterCourse(id) {
  return reviewCenterCourse(id, 'approved');
}

export function findCenterCourseForPlace(input) {
  input = input || {};
  const hay = `${input.city || ''} ${input.address || ''} ${input.title || ''}`;
  const ranked = COURSES.filter((item) => {
    if (item.status !== 'approved') return false;
    if (input.metro && item.metro && item.metro !== input.metro) return false;
    const token = regionToken(item.regionId);
    return hay.includes(item.regionId) || (token.length >= 2 && hay.includes(token));
  });
  return ranked.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null;
}

export function upsertCenterCourse(input) {
  const regionId = String(input?.regionId || '').trim();
  const title = String(input?.title || '').trim();
  if (!regionId || !title) {
    return { ok: false, message: '지역과 코스 제목을 입력해 주세요.' };
  }
  const now = new Date().toISOString();
  const existing = COURSES.find((item) =>
    (input.id && item.id === input.id) || (item.regionId === regionId && item.centerId === input.centerId),
  );
  const next = {
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
    return { ok: true, data: existing };
  }
  COURSES.unshift(next);
  return { ok: true, data: next };
}

export function centerCourseToFestivalCourse(course) {
  const stops = [
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
      place_name: item.stop?.name || `${course.regionId} 코스 ${item.step}`,
      description: item.stop?.description || course.description,
      estimated_time: item.time,
      latitude: item.stop?.latitude,
      longitude: item.stop?.longitude,
    })),
    local_benefit_tip: course.description || '지역 센터장이 현장에서 발굴한 추천 코스입니다.',
  };
}
