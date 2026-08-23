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
    return res.data?.data ?? local;
  } catch {
    return local;
  }
}
