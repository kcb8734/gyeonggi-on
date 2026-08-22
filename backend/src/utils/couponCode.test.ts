import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateCouponCode } from './couponCode';

test('generateCouponCode fits user_coupons.coupon_code VARCHAR(32)', () => {
  const code = generateCouponCode();
  assert.match(code, /^GYON-[0-9A-F]{16}$/);
  assert.ok(code.length <= 32);
  assert.notEqual(generateCouponCode(), code);
});
