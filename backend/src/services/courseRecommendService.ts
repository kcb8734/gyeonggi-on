import { municipalityFromAddress } from '../constants/gyeonggiCities';
import { tryQuery } from '../db/pool';
import { memoryEditorsPicks } from './inMemoryPlatform';

export type CourseItinerary = {
  step: number;
  category: '역사체험' | '전통시장 먹거리' | '메인 축제' | '캠핑장/숙박';
  place_name: string;
  description: string;
  estimated_time: string;
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
  const city = input.city
    || municipalityFromAddress(input.address || title)
    || '파주';
  const festival = title || `${city} 지역 축제`;
  const bean = /장단콩/.test(festival);

  return {
    course_title: bean
      ? `[파주] 장단콩 축제와 함께하는 역사·캠핑 힐링 투어`
      : `[${city}] ${festival}와 함께하는 역사·캠핑 힐링 투어`,
    target_audience: '가족 · 연인 · 캠핑을 즐기는 2030 여행객',
    total_distance: bean ? '36km' : '38km',
    itinerary: [
      {
        step: 1,
        category: '역사체험',
        place_name: bean ? '임진각 평화누리 / 도라전망대' : `${city} 대표 역사 명소`,
        description: bean
          ? '접경 역사와 평화 전망을 먼저 둘러보고 축제장으로 이어지는 동선을 잡습니다.'
          : `${city}의 대표 유적·전시 공간을 둘러보며 축제 배경을 이해합니다.`,
        estimated_time: '1시간 30분',
      },
      {
        step: 2,
        category: '전통시장 먹거리',
        place_name: bean ? '문산·금촌 전통시장' : `${city} 전통시장`,
        description: '추천 먹거리를 고른 뒤 On&On 쿠폰 QR을 제시하면 지자체 매칭 할인이 적용됩니다.',
        estimated_time: '1시간',
      },
      {
        step: 3,
        category: '메인 축제',
        place_name: festival,
        description: '축제 핵심 프로그램과 체험 부스를 즐기고, 현장 가맹점에서 쿠폰을 사용합니다.',
        estimated_time: '3시간',
      },
      {
        step: 4,
        category: '캠핑장/숙박',
        place_name: bean ? '파주 임진각 오토캠핑장' : `${city} 인근 캠핑장`,
        description: '축제장에서 가까운 캠핑장에서 하루를 머물며 다음날 아침 시장 브런치를 이어갑니다.',
        estimated_time: '숙박',
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
