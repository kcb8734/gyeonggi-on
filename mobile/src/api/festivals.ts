import { api } from './client';
import type { FestivalMapResponse, FestivalPin, NearbyFestivalsResponse } from '../types/map';

export async function fetchNearbyFestivals(params?: {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  merchantId?: string;
}): Promise<FestivalPin[]> {
  const res = await api.get<NearbyFestivalsResponse>('/api/festivals/nearby', {
    params: {
      latitude: params?.latitude,
      longitude: params?.longitude,
      radius_km: params?.radiusKm,
      merchant_id: params?.merchantId,
    },
  });
  return res.data.data ?? [];
}

export async function fetchFestivalMap(festivalId: string): Promise<FestivalMapResponse> {
  const res = await api.get<FestivalMapResponse>(`/api/festivals/${festivalId}/map`);
  return res.data;
}
