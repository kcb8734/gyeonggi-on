import { api } from './client';
import type { IssueCouponResponse } from '../types/map';

export async function issueCoupon(userId: string, promotionId: string): Promise<string> {
  const res = await api.post<IssueCouponResponse>('/api/coupons/issue', {
    user_id: userId,
    promotion_id: promotionId,
  });
  const code = res.data.data?.coupon_code;
  if (!code) {
    throw new Error(res.data.message || '쿠폰 코드를 받지 못했습니다.');
  }
  return code;
}
