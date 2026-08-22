import { api } from './client';
import { PREVIEW_HOME } from './previewHome';
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
    return {
      success: true,
      available: false,
      message: '해당 지역 서비스 준비 중입니다',
      metro,
      festivals: [],
      promotions: [],
      popular: [],
    };
  }

  const popular = category
    ? PREVIEW_HOME.festivals.filter((item) => item.category === category)
    : PREVIEW_HOME.festivals;
  return { ...PREVIEW_HOME, popular };
}
