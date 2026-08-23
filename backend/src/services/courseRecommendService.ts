import { landmarkFor } from '../constants/courseLandmarks';
import { municipalityFromAddress } from '../constants/gyeonggiCities';
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

export function buildFestivalCourse(input: { title?: string; city?: string; address?: string }): FestivalCourse {
  const title = String(input.title || '').trim();
  const guessed = municipalityFromAddress(input.address || title);
  const city = input.city
    || (/장단콩/.test(title) ? '파주' : '')
    || (guessed && guessed !== '경기도' ? guessed : '')
    || '수원';
  const festival = title || `${city} 지역 축제`;
  const history = landmarkFor('history', city, input.address, title);
  const market = landmarkFor('market', city, input.address, title);
  const camp = landmarkFor('camp', city, input.address, title);

  return {
    course_title: `[${city}] ${festival}와 함께하는 역사·시장·캠핑 투어`,
    target_audience: '가족 · 연인 · 캠핑을 즐기는 2030 여행객',
    total_distance: '32~40km',
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
        description: '축제 핵심 프로그램과 체험 부스를 즐기고, 현장 가맹점에서 쿠폰을 사용합니다.',
        estimated_time: '3시간',
        latitude: (history.lat + market.lat) / 2,
        longitude: (history.lng + market.lng) / 2,
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
    local_benefit_tip: 'On&On 플랫폼에서 발급한 모바일 쿠폰으로 전통시장·축제 인근 점포 결제 시 점주 할인에 지자체 매칭 포인트가 더해집니다. 사용 후 가맹점 정산 공문으로 자동 청구됩니다.',
  };
}

export async function recommendFestivalCourse(input: { title?: string; city?: string; festivalId?: string }) {
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
