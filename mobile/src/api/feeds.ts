import { api } from './client';

export interface LocalCurrencyCoupon {
  id: string;
  title: string;
  amount: number;
  kind: 'LOCAL_CURRENCY';
  festivalId: string;
  festivalTitle: string;
  issuedAt: string;
}

export interface FeedRewardResult {
  rewarded: boolean;
  pointsAwarded: number;
  badge: '지자체 지원 리워드 지급완료' | '지자체 1:1 매칭 피드';
  coupon?: LocalCurrencyCoupon;
}

export async function submitFeedReward(input: {
  userId: string;
  festivalId: string;
  festivalTitle: string;
  caption: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
}): Promise<FeedRewardResult> {
  const res = await api.post('/api/feeds', {
    user_id: input.userId,
    festival_id: input.festivalId,
    festival_title: input.festivalTitle,
    caption: input.caption,
    image_url: input.imageUrl,
    latitude: input.latitude,
    longitude: input.longitude,
  });
  const data = res.data?.data;
  return {
    rewarded: Boolean(data?.rewarded),
    pointsAwarded: Number(data?.points_awarded ?? 0),
    badge: data?.badge === '지자체 1:1 매칭 피드' ? '지자체 1:1 매칭 피드' : '지자체 지원 리워드 지급완료',
    coupon: data?.reward?.coupon,
  };
}

export async function fetchRewardBalance(userId: string) {
  const res = await api.get(`/api/feeds/rewards/${userId}`);
  return res.data?.data as { points: number; coupons: LocalCurrencyCoupon[] } | undefined;
}
