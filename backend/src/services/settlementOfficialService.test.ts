import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSettlementPreview } from './settlementOfficialService';

test('settlement preview includes official html and pending totals', async () => {
  const preview = await getSettlementPreview();
  assert.ok(preview.docNumber.startsWith('GON-'));
  assert.match(preview.html, /수신/);
  assert.match(preview.html, /직인/);
  assert.ok(preview.pending.count >= 1);
  assert.ok(preview.pending.amount > 0);
});
