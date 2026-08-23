import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isIssuedCouponCode, normalizeCouponCode } from './couponToken';

test('normalizeCouponCode extracts GYON and GGON tokens', () => {
  assert.equal(normalizeCouponCode('ggon-sw-1042'), 'GGON-SW-1042');
  assert.equal(normalizeCouponCode('https://www.kdanji.com/coupon?code=GYON-SCAN-0001'), 'GYON-SCAN-0001');
  assert.equal(normalizeCouponCode('쿠폰 GGON-SW-1042 입니다'), 'GGON-SW-1042');
});

test('isIssuedCouponCode accepts platform coupon prefixes', () => {
  assert.equal(isIssuedCouponCode('GGON-SW-1042'), true);
  assert.equal(isIssuedCouponCode('GYON-AABBCCDD'), true);
  assert.equal(isIssuedCouponCode('https://example.com'), false);
});
