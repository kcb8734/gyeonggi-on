import { api } from './client';
import { PREVIEW_HOME } from './previewHome';
import type { HomeFestival } from '../types/home';
import type {
  TourDetail,
  TourDetailResponse,
  TourFestival,
  TourFestivalsResponse,
  TourNearbyResponse,
  TourPlace,
} from '../types/tour';

export function homeFestivalFromTour(item: TourFestival): HomeFestival {
  return {
    id: `tour-${item.contentId}`,
    contentId: item.contentId,
    contentTypeId: item.contentTypeId,
    title: item.title,
    location_name: item.address,
    latitude: item.mapY,
    longitude: item.mapX,
    start_date: item.eventStartDate,
    end_date: item.eventEndDate,
    category: item.category,
    image_url: item.firstImage,
    is_trending: Boolean(item.firstImage),
    source: 'tour',
    tel: item.tel,
    description: item.overview,
    fee: item.fee,
  };
}

function previewFestivals(): TourFestival[] {
  return PREVIEW_HOME.festivals.map((item) => ({
    contentId: item.contentId ?? item.id,
    contentTypeId: '15',
    title: item.title,
    address: item.location_name ?? '',
    eventStartDate: item.start_date ?? '',
    eventEndDate: item.end_date ?? '',
    firstImage: item.image_url ?? undefined,
    mapX: item.longitude,
    mapY: item.latitude,
    tel: item.tel,
    category: (item.category as TourFestival['category']) ?? '문화/예술',
    overview: item.description ?? `${item.title} 상세 개요`,
    fee: item.fee ?? '현장 문의',
  }));
}

export async function fetchTourFestivals(params?: {
  areaCode?: string;
  month?: number;
  year?: number;
  category?: string;
}): Promise<TourFestival[]> {
  try {
    const res = await api.get<TourFestivalsResponse>('/api/tour/festivals', {
      timeout: 15000,
      params: {
        areaCode: params?.areaCode ?? 'all',
        month: params?.month,
        year: params?.year,
        category: params?.category,
      },
    });
    if (res.data?.data?.length) return res.data.data;
  } catch {
    // 백엔드/TourAPI 미기동 시 미리보기
  }
  return previewFestivals().filter((item) => {
    if (params?.category && item.category !== params.category) return false;
    if (!params?.month) return true;
    const start = item.eventStartDate.replace(/\D/g, '');
    const end = (item.eventEndDate || item.eventStartDate).replace(/\D/g, '');
    const monthStart = `${params.year ?? 2026}${String(params.month).padStart(2, '0')}01`;
    const last = new Date(params.year ?? 2026, params.month, 0).getDate();
    const monthEnd = `${params.year ?? 2026}${String(params.month).padStart(2, '0')}${String(last).padStart(2, '0')}`;
    return start <= monthEnd && end >= monthStart;
  });
}

export async function fetchTourNearby(params: {
  mapX: number;
  mapY: number;
  radius?: number;
}): Promise<TourPlace[]> {
  try {
    const res = await api.get<TourNearbyResponse>('/api/tour/nearby', {
      timeout: 15000,
      params: {
        mapX: params.mapX,
        mapY: params.mapY,
        radius: params.radius ?? 3000,
      },
    });
    if (res.data?.data) return res.data.data;
  } catch {
    // 미리보기
  }

  return [
    {
      contentId: 'preview-food',
      contentTypeId: '39',
      title: '행궁 한정식',
      address: '경기도 수원시 팔달구',
      mapX: params.mapX + 0.004,
      mapY: params.mapY + 0.002,
      kind: 'food',
    },
    {
      contentId: 'preview-attr',
      contentTypeId: '12',
      title: '화성행궁',
      address: '경기도 수원시 팔달구',
      mapX: params.mapX - 0.003,
      mapY: params.mapY + 0.001,
      kind: 'attraction',
    },
    {
      contentId: 'preview-culture',
      contentTypeId: '14',
      title: '수원화성박물관',
      address: '경기도 수원시 팔달구',
      mapX: params.mapX + 0.002,
      mapY: params.mapY - 0.003,
      kind: 'culture',
    },
  ];
}

export async function fetchTourDetail(contentId: string, contentTypeId?: string): Promise<TourDetail> {
  try {
    const res = await api.get<TourDetailResponse>(`/api/tour/detail/${contentId}`, {
      timeout: 15000,
      params: { contentTypeId },
    });
    if (res.data?.data) return res.data.data;
  } catch {
    // 미리보기
  }

  const preview = PREVIEW_HOME.festivals.find(
    (item) => item.contentId === contentId || item.id === contentId || `tour-${item.id}` === contentId,
  ) ?? PREVIEW_HOME.festivals[0];

  return {
    contentId,
    contentTypeId: contentTypeId ?? '15',
    title: preview.title,
    overview: preview.description ?? `${preview.title} 상세 정보를 불러오는 중입니다.`,
    address: preview.location_name ?? '',
    tel: preview.tel,
    firstImage: preview.image_url ?? undefined,
    mapX: preview.longitude,
    mapY: preview.latitude,
    eventStartDate: preview.start_date,
    eventEndDate: preview.end_date,
    fee: '현장 문의',
    images: preview.image_url ? [{ originUrl: preview.image_url }] : [],
    category: preview.category as TourDetail['category'],
  };
}
