import { api } from './client';
import type { IssueCouponResponse } from '../types/map';
import type { WalletCoupon } from '../stores/appStore';

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

interface MyCouponsResponse {
  success: boolean;
  data?: Array<{
    id: string;
    coupon_code: string;
    status: 'ISSUED' | 'USED';
    promotion_id: string;
    title: string;
    business_name: string;
    festival_title?: string | null;
    total_discount_rate: number;
    funding_type?: 'MERCHANT_ONLY' | 'MATCHED';
    end_time?: string;
  }>;
}

export async function fetchMyCoupons(userId: string): Promise<WalletCoupon[]> {
  try {
    const res = await api.get<MyCouponsResponse>('/api/coupons', { params: { user_id: userId } });
    return (res.data.data ?? []).map((row) => ({
      id: row.id,
      promotion_id: row.promotion_id,
      coupon_code: row.coupon_code,
      business_name: row.business_name,
      title: row.title,
      festival_title: row.festival_title,
      total_discount_rate: Number(row.total_discount_rate),
      funding_type: row.funding_type,
      expires_at: row.end_time?.slice(0, 10),
      status: row.status,
    }));
  } catch {
    return [];
  }
}
