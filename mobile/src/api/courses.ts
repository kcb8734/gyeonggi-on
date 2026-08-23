import { api } from './client';

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

export async function fetchRecommendedCourse(title?: string, city?: string): Promise<FestivalCourse | null> {
  try {
    const res = await api.get<{ success: boolean; data: FestivalCourse }>('/api/courses/recommend', {
      params: { title, city },
    });
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}
