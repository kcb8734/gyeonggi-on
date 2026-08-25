import { landmarkFor, resolveCourseCity } from '../constants/courseLandmarks';
import { regionById } from '../constants/regionTour';
import { tryQuery } from '../db/pool';
import { memoryEditorsPicks } from './inMemoryPlatform';

export type CourseItinerary = {
  step: number;
  category: '역사체험' | '전통시장 먹거리' | '메인 축제' | '캠핑장/숙박';
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

export function buildFestivalCourse(input: {
  title?: string;
  city?: string;
  address?: string;
  metro?: string;
  latitude?: number;
  longitude?: number;
}): FestivalCourse {
  const title = String(input.title || '').trim();
  const city = resolveCourseCity(input);
  const festival = !title || title === '축제 상세' ? `${city} 지역 축제` : title;
  const history = landmarkFor('history', city, input.address, title);
  const market = landmarkFor('market', city, input.address, title);
  const camp = landmarkFor('camp', city, input.address, title);
  const official = regionById(input.metro).officialMatching;
  const festLat = Number(input.latitude);
  const festLng = Number(input.longitude);
  const hasFestGps = Number.isFinite(festLat) && Number.isFinite(festLng) && festLat !== 0 && festLng !== 0;

  return {
    course_title: `[${city}] ${festival}와 함께하는 역사·시장·캠핑 투어`,
    target_audience: '가족 · 연인 · 캠핑을 즐기는 2030 여행객',
    total_distance: '18~40km',
    itinerary: [
      {
        step: 1,
        category: '역사체험',
        place_name: history.name,
        description: history.hint,
        estimated_time: '1시간 30분',
        latitude: history.lat,
        longitude: history.lng,
      },
      {
        step: 2,
        category: '전통시장 먹거리',
        place_name: market.name,
        description: market.hint,
        estimated_time: '1시간',
        latitude: market.lat,
        longitude: market.lng,
      },
      {
        step: 3,
        category: '메인 축제',
        place_name: festival,
        description: `${festival} 핵심 프로그램과 체험 부스를 즐기고, 현장 가맹점에서 On&On+ 쿠폰을 사용합니다.`,
        estimated_time: '3시간',
        latitude: hasFestGps ? festLat : (history.lat + market.lat) / 2,
        longitude: hasFestGps ? festLng : (history.lng + market.lng) / 2,
      },
      {
        step: 4,
        category: '캠핑장/숙박',
        place_name: camp.name,
        description: camp.hint,
        estimated_time: '숙박',
        latitude: camp.lat,
        longitude: camp.lng,
      },
    ],
    local_benefit_tip: official
      ? 'On&On+ 공식 매칭 쿠폰으로 전통시장·축제 인근 점포 결제 시 점주 할인에 지자체 매칭 포인트가 더해집니다. 사용 후 가맹점 정산 공문으로 자동 청구됩니다.'
      : '이 권역은 소상공인 자율 할인 쿠폰입니다. 지자체 매칭 없이 점주 할인이 적용되며, 전통시장·축제 인근 점포에서 On&On+ 모바일 쿠폰으로 결제할 수 있습니다.',
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
}) {
  const course = buildFestivalCourse(input);
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
