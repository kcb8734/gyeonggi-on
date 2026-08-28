import {
  COUPON_COMING_SOON,
  inferCoursePlaceKind,
  kmBetween,
  landmarkFor,
  LOCAL_COURSE_MAX_KM,
  resolveCourseCity,
  withCouponComingSoon,
  type CoursePlaceKind,
} from '../constants/courseLandmarks';
import type { FestivalCourse } from '../api/courses';

function hubCopy(kind: CoursePlaceKind, name: string) {
  if (kind === 'food') {
    return {
      category: '맛집',
      titleSuffix: '맛집과 함께하는 역사·시장 코스',
      description: `${name}에서 음식을 즐깁니다. 음식점 소개와 메뉴를 확인하고 방문하세요. ${COUPON_COMING_SOON}`,
      estimated_time: '1시간 30분',
      audience: '가족 · 연인 · 맛집 여행을 즐기는 여행객',
    };
  }
  if (kind === 'attraction') {
    return {
      category: '관광지',
      titleSuffix: '와 함께하는 역사·시장 코스',
      description: `${name}을 둘러봅니다. ${COUPON_COMING_SOON}`,
      estimated_time: '1시간 30분',
      audience: '가족 · 연인 · 캠핑을 즐기는 2030 여행객',
    };
  }
  if (kind === 'culture') {
    return {
      category: '문화',
      titleSuffix: '와 함께하는 역사·시장 코스',
      description: `${name}의 전시와 공간을 둘러봅니다. ${COUPON_COMING_SOON}`,
      estimated_time: '1시간 30분',
      audience: '가족 · 연인 · 캠핑을 즐기는 2030 여행객',
    };
  }
  return {
    category: '메인 축제',
    titleSuffix: '와 함께하는 역사·시장·캠핑 투어',
    description: `${name} 행사를 둘러봅니다. ${COUPON_COMING_SOON}`,
    estimated_time: '3시간',
    audience: '가족 · 연인 · 캠핑을 즐기는 2030 여행객',
  };
}

export function buildFestivalCourse(input: {
  title?: string;
  city?: string;
  address?: string;
  metro?: string;
  latitude?: number;
  longitude?: number;
  contentTypeId?: string;
  kind?: string;
  category?: string;
}): FestivalCourse {
  const title = String(input.title || '').trim();
  const city = resolveCourseCity(input) || '이 지역';
  const placeKind = inferCoursePlaceKind({
    contentTypeId: input.contentTypeId,
    kind: input.kind,
    title,
    category: input.category,
  });
  const hubName = !title || title === '축제 상세' ? `${city} 지역 축제` : title;
  const hub = hubCopy(placeKind, hubName);
  const history = landmarkFor('history', city, input.address, title, input);
  const market = landmarkFor('market', city, input.address, title, input);
  const camp = landmarkFor('camp', city, input.address, title, input);
  const festLat = Number(input.latitude);
  const festLng = Number(input.longitude);
  const hasFestGps = Number.isFinite(festLat) && Number.isFinite(festLng) && festLat !== 0 && festLng !== 0;
  const itinerary = [
    {
      step: 1,
      category: '역사체험',
      place_name: history.name,
      description: withCouponComingSoon(history.hint),
      estimated_time: '1시간 30분',
      latitude: history.lat,
      longitude: history.lng,
    },
    {
      step: 2,
      category: '전통시장 먹거리',
      place_name: market.name,
      description: withCouponComingSoon(market.hint),
      estimated_time: '1시간',
      latitude: market.lat,
      longitude: market.lng,
    },
    {
      step: 3,
      category: hub.category,
      place_name: hubName,
      description: hub.description,
      estimated_time: hub.estimated_time,
      latitude: hasFestGps ? festLat : (history.lat + market.lat) / 2,
      longitude: hasFestGps ? festLng : (history.lng + market.lng) / 2,
    },
    {
      step: 4,
      category: '캠핑장/숙박',
      place_name: camp.name,
      description: withCouponComingSoon(camp.hint),
      estimated_time: '숙박',
      latitude: camp.lat,
      longitude: camp.lng,
    },
  ];
  const span = Math.round(itinerarySpanKm({ itinerary }));

  return {
    course_title: hub.titleSuffix.startsWith('와')
      ? `[${city}] ${hubName}${hub.titleSuffix}`
      : `[${city}] ${hubName} ${hub.titleSuffix}`,
    target_audience: hub.audience || '가족 · 연인 · 캠핑을 즐기는 2030 여행객',
    total_distance: span > 0 ? `${Math.max(3, span - 4)}~${Math.max(8, span)}km` : '4~12km',
    itinerary,
    local_benefit_tip: COUPON_COMING_SOON,
  };
}

function itinerarySpanKm(course: { itinerary?: FestivalCourse['itinerary'] }) {
  const pts = (course.itinerary ?? [])
    .map((step) => ({ lat: Number(step.latitude), lng: Number(step.longitude) }))
    .filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lng) && pt.lat !== 0);
  if (pts.length < 2) return 0;
  let max = 0;
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      max = Math.max(max, kmBetween(pts[i].lat, pts[i].lng, pts[j].lat, pts[j].lng));
    }
  }
  return max;
}

/** 같은 지명 혼동·수원 기본값처럼 장소와 동떨어진 원격 코스는 로컬 생성본을 쓴다. */
export function shouldRejectRemoteCourse(
  course: FestivalCourse,
  input: {
    title?: string;
    city?: string;
    address?: string;
    metro?: string;
    latitude?: number;
    longitude?: number;
  },
) {
  const hay = `${input.city || ''} ${input.address || ''} ${input.title || ''} ${input.metro || ''}`;
  const places = (course.itinerary ?? []).map((step) => `${step.place_name} ${step.category}`).join(' ');
  const gyeonggiGwangju = /경기도.{0,10}광주|경기광주/.test(hay)
    || (/광주시/.test(hay) && !/광주광역시/.test(hay) && /GYEONGGI|경기/.test(hay));
  if (gyeonggiGwangju && /무등산|아시아문화전당|양림|대인시장/.test(places)) return true;
  const metroGwangju = (/광주광역시|광산구/.test(hay) || input.metro === 'GWANGJU') && !/경기도.{0,10}광주/.test(hay);
  if (metroGwangju && /남한산성|경기도자|경안시장|화담숲|곤지암/.test(places)) return true;

  const city = resolveCourseCity(input);
  if (city && city !== '수원' && /수원화성|화성행궁|영동시장|광교호수/.test(places)) return true;
  if (city && city !== '용인' && /한국민속촌/.test(places)) return true;

  const originLat = Number(input.latitude);
  const originLng = Number(input.longitude);
  if (Number.isFinite(originLat) && Number.isFinite(originLng) && originLat !== 0 && originLng !== 0) {
    const far = (course.itinerary ?? []).filter((step) => {
      if (Number(step.step) === 3) return false;
      const lat = Number(step.latitude);
      const lng = Number(step.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0) return false;
      return kmBetween(originLat, originLng, lat, lng) > LOCAL_COURSE_MAX_KM;
    });
    if (far.length >= 1) return true;
  }

  const history = course.itinerary?.[0]?.place_name || '';
  return Boolean(city) && city !== '수원' && /수원화성|화성행궁|한국민속촌|광교호수/.test(history);
}
