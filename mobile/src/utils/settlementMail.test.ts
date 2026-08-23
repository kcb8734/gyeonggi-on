import assert from 'node:assert/strict';
import { test } from 'node:test';
import { couponDiscountWon, matchingAmountWon, mergeQrScans, settlementFromScans } from './settlementAmounts';

test('settlementFromScans matches coupon discount amounts', () => {
  const totals = settlementFromScans([
    { amountWon: 3000 },
    { amountWon: 1500 },
  ]);
  assert.equal(totals.count, 2);
  assert.equal(totals.perUse, 1500);
  assert.equal(totals.total, 4500);
});

test('gov matching formula is not used as scanned discount', () => {
  const matching = matchingAmountWon({ maxDiscountAmount: 5000, govRate: 10, qrCount: 2 });
  const scanned = settlementFromScans([{ amountWon: 3000 }, { amountWon: 1500 }]);
  assert.equal(matching.total, 1000);
  assert.equal(scanned.total, 4500);
  assert.notEqual(scanned.total, matching.total);
});

test('couponDiscountWon prefers scan amount over matching formula', () => {
  assert.equal(couponDiscountWon({ discountAmount: 3000, maxDiscountAmount: 5000 }), 3000);
  assert.equal(couponDiscountWon({ maxDiscountAmount: 5000 }), 5000);
  assert.equal(couponDiscountWon({ totalDiscountRate: 10 }), 3000);
});

test('settlement request equals scanned discounts even when gov matching is 10%', () => {
  const matching = matchingAmountWon({ maxDiscountAmount: 5000, govRate: 10, qrCount: 1 });
  const scan = couponDiscountWon({ discountAmount: 3000 });
  assert.equal(matching.perUse, 500);
  assert.equal(scan, 3000);
  const documentTotal = settlementFromScans([{ amountWon: scan }]).total;
  assert.equal(documentTotal, 3000);
});

test('mergeQrScans keeps one row per coupon code', () => {
  const merged = mergeQrScans(
    [{ at: '2026-08-23T01:00:00.000Z', amountWon: 3000, code: 'GGON-SW-1042' }],
    [{ at: '2026-08-23T03:00:00.000Z', amountWon: 3000, code: 'ggon-sw-1042' }],
    [{ at: '2026-08-23T02:00:00.000Z', amountWon: 2000, code: 'GYON-USED-0001' }],
  );
  assert.equal(merged.length, 2);
  assert.equal(merged.reduce((sum, row) => sum + row.amountWon, 0), 5000);
});
