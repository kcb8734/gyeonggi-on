import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchingAmountWon, settlementFromScans } from './settlementAmounts';

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
