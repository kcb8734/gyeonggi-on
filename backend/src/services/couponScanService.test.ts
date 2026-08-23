import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateCouponStatus, verifyCouponCode, useCouponCode } from './couponScanService';
import { AppError } from '../utils/errors';

test('validateCouponStatus rejects used coupon', () => {
  assert.throws(
    () => validateCouponStatus({
      id: '1',
      code: 'X',
      title: 't',
      discountAmount: 1000,
      municipalityId: null,
      merchantId: null,
      isUsed: true,
      usedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      settlementId: null,
      source: 'coupons',
    }),
    (err: unknown) => err instanceof AppError && err.status === 409,
  );
});

test('verify demo unused coupon then use it', async () => {
  const { memoryCoupons } = await import('./inMemoryPlatform');
  const demo = memoryCoupons.find((item) => item.code === 'GYON-SCAN-0001');
  if (demo) {
    demo.isUsed = false;
    demo.usedAt = null;
    demo.settlementId = null;
  }
  const verified = await verifyCouponCode('GYON-SCAN-0001');
  assert.equal(verified.title, '온앤온 현장 할인');
  assert.equal(verified.isUsed, false);
  const used = await useCouponCode('GYON-SCAN-0001');
  assert.equal(used.isUsed, true);
  const again = await verifyCouponCode('GYON-SCAN-0001');
  assert.equal(again.isUsed, true);
  assert.equal(again.discountAmount, 1500);
  await assert.rejects(() => useCouponCode('GYON-SCAN-0001'), (err: unknown) => (
    err instanceof AppError && err.status === 409
  ));
});

test('plain text without coupon token is rejected', async () => {
  await assert.rejects(() => verifyCouponCode('NO-SUCH-CODE'), (err: unknown) => (
    err instanceof AppError && err.status === 400
  ));
});

test('wallet coupon GGON-SW-1042 is accepted', async () => {
  const { memoryCoupons } = await import('./inMemoryPlatform');
  const wallet = memoryCoupons.find((item) => item.code === 'GGON-SW-1042');
  if (wallet) {
    wallet.isUsed = false;
    wallet.usedAt = null;
  }
  const verified = await verifyCouponCode('https://www.kdanji.com/?code=ggon-sw-1042');
  assert.equal(verified.code, 'GGON-SW-1042');
  assert.equal(verified.isUsed, false);
});

test('used coupon keeps scan discount for settlement matching', async () => {
  const verified = await verifyCouponCode('GYON-USED-0001');
  assert.equal(verified.isUsed, true);
  assert.equal(verified.discountAmount, 3000);
});
