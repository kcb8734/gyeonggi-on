export type CouponScanRecord = {
  id: string;
  code: string;
  title: string;
  discountAmount: number;
  municipalityId: string | null;
  merchantId: string | null;
  isUsed: boolean;
  usedAt: string | null;
  expiresAt: string | null;
  settlementId: string | null;
  source: 'coupons' | 'user_coupons';
};
