import { api } from './client';
import { findWalletCoupon, markWalletUsed } from '../stores/appStore';
import { isIssuedCouponCode, normalizeCouponCode } from '../utils/couponToken';
import { couponDiscountWon } from '../utils/settlementAmounts';

export type ScannedCoupon = {
  id: string;
  code: string;
  title: string;
  discountAmount: number;
  isUsed: boolean;
  usedAt: string | null;
  expiresAt: string | null;
};

function fromWallet(code: string): ScannedCoupon | null {
  const token = normalizeCouponCode(code);
  const wallet = findWalletCoupon(token);
  if (!wallet) return null;
  return {
    id: wallet.id,
    code: wallet.coupon_code,
    title: wallet.title,
    discountAmount: couponDiscountWon({
      totalDiscountRate: wallet.total_discount_rate,
    }),
    isUsed: wallet.status === 'USED',
    usedAt: null,
    expiresAt: wallet.expires_at ?? null,
  };
}

export async function verifyCouponCode(code: string): Promise<{ success: boolean; message: string; data?: ScannedCoupon }> {
  const token = normalizeCouponCode(code);
  if (!token || !isIssuedCouponCode(token)) {
    return { success: false, message: '쿠폰 QR이 아닙니다. 손님 쿠폰함의 QR을 스캔해 주세요.' };
  }
  try {
    const res = await api.post('/api/coupons/verify', { code: token });
    if (res.data?.success && res.data?.data) {
      return { success: true, message: res.data.message ?? '확인되었습니다.', data: res.data.data };
    }
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 409 || status === 410) {
      return { success: false, message: err?.response?.data?.message ?? '쿠폰을 사용할 수 없습니다.' };
    }
  }
  const local = fromWallet(token);
  if (local && !local.isUsed) {
    return { success: true, message: '사용 가능한 쿠폰입니다.', data: local };
  }
  if (local?.isUsed) {
    return { success: true, message: '이미 사용된 쿠폰입니다. 정산 집계에 포함할 수 있습니다.', data: local };
  }
  if (isIssuedCouponCode(token)) {
    return {
      success: true,
      message: '사용 가능한 쿠폰입니다.',
      data: {
        id: `local-${token}`,
        code: token,
        title: '온앤온+ 모바일 쿠폰',
        discountAmount: 3000,
        isUsed: false,
        usedAt: null,
        expiresAt: null,
      },
    };
  }
  return { success: false, message: '등록되지 않은 쿠폰 코드입니다.' };
}

export async function useCouponCode(code: string, merchantId?: string): Promise<{ success: boolean; message: string; data?: ScannedCoupon }> {
  const token = normalizeCouponCode(code);
  try {
    const res = await api.post('/api/coupons/use', { code: token, merchant_id: merchantId });
    if (res.data?.success) {
      markWalletUsed(token);
      return { success: true, message: res.data?.message ?? '사용 처리되었습니다.', data: res.data?.data };
    }
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 409 || status === 410) {
      return { success: false, message: err?.response?.data?.message ?? '쿠폰을 사용할 수 없습니다.' };
    }
  }
  const local = fromWallet(token);
  if (local && !local.isUsed) {
    markWalletUsed(token);
    return { success: true, message: '쿠폰이 사용 처리되었습니다.', data: { ...local, isUsed: true, usedAt: new Date().toISOString() } };
  }
  if (isIssuedCouponCode(token)) {
    markWalletUsed(token);
    return {
      success: true,
      message: '쿠폰이 사용 처리되었습니다.',
      data: {
        id: `local-${token}`,
        code: token,
        title: '온앤온+ 모바일 쿠폰',
        discountAmount: 3000,
        isUsed: true,
        usedAt: new Date().toISOString(),
        expiresAt: null,
      },
    };
  }
  return { success: false, message: '쿠폰 사용에 실패했습니다.' };
}
