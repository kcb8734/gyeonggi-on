import {
  COUPON_COMING_SOON,
  inferCoursePlaceKind,
  landmarkFor,
  resolveCourseCity,
  withCouponComingSoon,
  type CoursePlaceKind,
} from '../constants/courseLandmarks';
import { tryQuery } from '../db/pool';
import { memoryEditorsPicks } from './inMemoryPlatform';
import { centerCourseToFestivalCourse, findCenterCourseForPlace } from '../constants/centerCourses';

export type CourseItinerary = {
  step: number;
  category: string;
  place_name: string;
  description: string;
  estimated_time: string;
  latitude: number;
  longitude: number;
};

export type FestivalCourse = {
  course_title: string;
  target_audience: string;
  total_distance: string;
  itinerary: CourseItinerary[];
  local_benefit_tip: string;
};

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

  return {
    course_title: hub.titleSuffix.startsWith('와')
      ? `[${city}] ${hubName}${hub.titleSuffix}`
      : `[${city}] ${hubName} ${hub.titleSuffix}`,
    target_audience: hub.audience || '가족 · 연인 · 캠핑을 즐기는 2030 여행객',
    total_distance: '18~40km',
    itinerary: [
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
    ],
    local_benefit_tip: COUPON_COMING_SOON,
  };
}

export async function recommendFestivalCourse(input: {
  title?: string;
  city?: string;
  address?: string;
  metro?: string;
  latitude?: number;
  longitude?: number;
  festivalId?: string;
  contentTypeId?: string;
  kind?: string;
  category?: string;
}) {
  const center = findCenterCourseForPlace(input);
  const course = center ? centerCourseToFestivalCourse(center) : buildFestivalCourse(input);
  const saved = await tryQuery(
    `INSERT INTO ai_courses (festival_id, festival_title, course_json, recommend_count)
     VALUES ($1, $2, $3::jsonb, 1)
     RETURNING id, is_editors_pick, recommend_count, save_count`,
    [input.festivalId ?? input.title ?? '', course.course_title, JSON.stringify(course)],
  );
  const row = saved?.rows[0];
  const courseId = String(row?.id ?? `course-${Date.now()}`);
  return {
    ...course,
    course_id: courseId,
    is_editors_pick: Boolean(row?.is_editors_pick) || memoryEditorsPicks.has(courseId),
    recommend_count: Number(row?.recommend_count ?? 1),
    save_count: Number(row?.save_count ?? 0),
  };
}
