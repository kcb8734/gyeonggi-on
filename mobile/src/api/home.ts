import { api } from './client';
import { PREVIEW_HOME } from './previewHome';
import { REGION_FESTIVAL_FALLBACKS, fallbackPromotions } from '../constants/regionTour';
import type { HomeFeed } from '../types/home';

export async function fetchHomeFeed(metro: string, category?: string): Promise<HomeFeed> {
  try {
    const res = await api.get<HomeFeed>('/api/home', { params: { metro, category } });
    if (res.data?.festivals) {
      return {
        ...res.data,
        popular: res.data.popular?.length ? res.data.popular : res.data.festivals,
      };
    }
  } catch {
    // 백엔드 미기동 시 미리보기
  }

  if (metro !== 'GYEONGGI') {
    const festivals = REGION_FESTIVAL_FALLBACKS[metro] ?? [];
    const promotions = fallbackPromotions(metro);
    return {
      success: true,
      available: festivals.length > 0,
      message: festivals.length ? undefined : '선택하신 권역에 등록된 축제가 없습니다. 다른 권역을 선택해보세요',
      metro,
      festivals,
      promotions,
      popular: festivals,
    };
  }

  const popular = category
    ? PREVIEW_HOME.festivals.filter((item) => item.category === category)
    : PREVIEW_HOME.festivals;
  return { ...PREVIEW_HOME, popular };
}
