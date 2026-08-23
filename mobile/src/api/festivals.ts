import { api } from './client';
import { PREVIEW_HOME } from './previewHome';
import type { HomeFestival } from '../types/home';
import type { FestivalMapResponse, FestivalPin, NearbyFestivalsResponse } from '../types/map';

export async function fetchListedFestivals(): Promise<HomeFestival[]> {
  try {
    const res = await api.get<{ festivals?: HomeFestival[]; data?: HomeFestival[] }>('/api/festivals');
    const rows = res.data?.festivals?.length ? res.data.festivals : res.data?.data;
    if (rows?.length) return rows;
  } catch {
    // 미리보기 폴백
  }
  return [];
}

export async function fetchNearbyFestivals(params?: {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  merchantId?: string;
}): Promise<FestivalPin[]> {
  try {
    const res = await api.get<NearbyFestivalsResponse>('/api/festivals/nearby', {
      params: {
        latitude: params?.latitude,
        longitude: params?.longitude,
        radius_km: params?.radiusKm,
        merchant_id: params?.merchantId,
      },
    });
    if (res.data.data?.length) return res.data.data;
  } catch {
    // 미리보기 폴백
  }
  return PREVIEW_HOME.festivals;
}

export async function fetchFestivalMap(festivalId: string): Promise<FestivalMapResponse> {
  try {
    const res = await api.get<FestivalMapResponse>(`/api/festivals/${festivalId}/map`);
    if (res.data.festival) return res.data;
  } catch {
    // 미리보기 폴백
  }
  const festival = PREVIEW_HOME.festivals.find((item) => item.id === festivalId) ?? PREVIEW_HOME.festivals[0];
  return { success: true, festival, merchants: [] };
}
