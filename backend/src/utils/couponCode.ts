import { randomBytes } from 'crypto';

/** QR 스캔용 쿠폰 코드. user_coupons.coupon_code VARCHAR(32) 한도 안. */
export function generateCouponCode(): string {
  return `GYON-${randomBytes(8).toString('hex').toUpperCase()}`;
}
