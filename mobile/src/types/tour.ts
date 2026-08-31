import type { FestivalCategory } from './home';

export type TourPlaceKind = 'festival' | 'attraction' | 'food' | 'culture' | 'shopping' | 'stay' | 'other';

export interface TourFestival {
  contentId: string;
  contentTypeId: string;
  title: string;
  address: string;
  eventStartDate: string;
  eventEndDate: string;
  firstImage?: string;
  firstImage2?: string;
  mapX: number;
  mapY: number;
  tel?: string;
  category: FestivalCategory;
  overview?: string;
  fee?: string;
  eventPlace?: string;
  areaCode?: string;
  source?: 'tour' | 'fallback' | 'sample';
}

export interface TourPlace {
  contentId: string;
  contentTypeId: string;
  title: string;
  address: string;
  firstImage?: string;
  mapX: number;
  mapY: number;
  tel?: string;
  distanceMeters?: number;
  kind: TourPlaceKind;
}

export interface TourImage {
  originUrl: string;
  smallUrl?: string;
  name?: string;
}

export interface TourDetail {
  contentId: string;
  contentTypeId: string;
  title: string;
  overview?: string;
  address: string;
  tel?: string;
  homepage?: string;
  firstImage?: string;
  mapX: number;
  mapY: number;
  eventStartDate?: string;
  eventEndDate?: string;
  eventPlace?: string;
  playtime?: string;
  fee?: string;
  images: TourImage[];
  category?: FestivalCategory;
}

export interface TourFestivalsResponse {
  success: boolean;
  areaCode: string;
  month: number | null;
  year: number;
  count: number;
  source?: string;
  data: TourFestival[];
}

export interface TourNearbyResponse {
  success: boolean;
  mapX: number;
  mapY: number;
  radius: number;
  count: number;
  data: TourPlace[];
}

export interface TourDetailResponse {
  success: boolean;
  data: TourDetail;
}

export const TOUR_KIND_META: Record<TourPlaceKind, { label: string; pinColor: string; badge: string }> = {
  festival: { label: '축제', pinColor: 'red', badge: '축' },
  attraction: { label: '관광지', pinColor: 'violet', badge: '관' },
  food: { label: '맛집', pinColor: 'orange', badge: '맛' },
  culture: { label: '문화', pinColor: 'blue', badge: '문' },
  shopping: { label: '쇼핑', pinColor: 'teal', badge: '쇼' },
  stay: { label: '숙박', pinColor: 'gray', badge: '숙' },
  other: { label: '기타', pinColor: 'gray', badge: '기' },
};
