import { api } from './client';

export type ScannedCoupon = {
  id: string;
  code: string;
  title: string;
  discountAmount: number;
  isUsed: boolean;
  usedAt: string | null;
  expiresAt: string | null;
};

export async function verifyCouponCode(code: string): Promise<{ success: boolean; message: string; data?: ScannedCoupon }> {
  try {
    const res = await api.post('/api/coupons/verify', { code });
    return { success: Boolean(res.data?.success), message: res.data?.message ?? '확인되었습니다.', data: res.data?.data };
  } catch (err: any) {
    return { success: false, message: err?.response?.data?.message ?? '쿠폰 확인에 실패했습니다.' };
  }
}

export async function useCouponCode(code: string, merchantId?: string): Promise<{ success: boolean; message: string; data?: ScannedCoupon }> {
  try {
    const res = await api.post('/api/coupons/use', { code, merchant_id: merchantId });
    return { success: Boolean(res.data?.success), message: res.data?.message ?? '사용 처리되었습니다.', data: res.data?.data };
  } catch (err: any) {
    return { success: false, message: err?.response?.data?.message ?? '쿠폰 사용에 실패했습니다.' };
  }
}
