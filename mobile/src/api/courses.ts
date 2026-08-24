import { api } from './client';
import { buildFestivalCourse } from '../utils/festivalCourse';

export type CourseItinerary = {
  step: number;
  category: string;
  place_name: string;
  description: string;
  estimated_time: string;
  latitude?: number;
  longitude?: number;
};

export type FestivalCourse = {
  course_title: string;
  target_audience: string;
  total_distance: string;
  itinerary: CourseItinerary[];
  local_benefit_tip: string;
};

export type CourseQuery = {
  title?: string;
  city?: string;
  address?: string;
  metro?: string;
  latitude?: number;
  longitude?: number;
};

function looksLikeDefaultSuwon(course: FestivalCourse, input: CourseQuery) {
  const city = `${input.city || ''} ${input.address || ''} ${input.title || ''} ${input.metro || ''}`;
  const localContext = /수원|용인|GYEONGGI/.test(city)
    && !/보령|여수|제주|서울|인천|춘천|강릉|부산|진주|경주|청주|전주|강원|GANGWON|속초|평창/.test(city);
  const history = course.itinerary?.[0]?.place_name || '';
  return !localContext && /수원화성|화성행궁|한국민속촌|광교호수/.test(history);
}

export async function fetchRecommendedCourse(query: CourseQuery | string = {}): Promise<FestivalCourse | null> {
  const input = typeof query === 'string' ? { title: query } : query;
  const local = buildFestivalCourse(input);
  try {
    const res = await api.get<{ success: boolean; data: FestivalCourse }>('/api/courses/recommend', {
      params: {
        title: input.title,
        city: input.city,
        address: input.address,
        metro: input.metro,
        lat: input.latitude,
        lng: input.longitude,
      },
    });
    const remote = res.data?.data;
    if (remote && !looksLikeDefaultSuwon(remote, input)) return remote;
  } catch {
    // 로컬 코스 사용
  }
  return local;
}
