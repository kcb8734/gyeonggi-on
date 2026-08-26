import assert from 'node:assert/strict';
import { test } from 'node:test';
import { festivalHasCoupon } from './festivalCoupon';

test('hasCoupon flag and promotion matching', () => {
  assert.equal(festivalHasCoupon({ hasCoupon: true, title: '축제' }, []), true);
  assert.equal(
    festivalHasCoupon({ id: 'tour-1', title: '수원화성문화제' }, [{ festival_id: 'tour-1', remaining_quantity: 2 }]),
    true,
  );
  assert.equal(
    festivalHasCoupon({ title: '수원화성문화제' }, [{ festival_title: '보령', remaining_quantity: 2 }]),
    false,
  );
});
