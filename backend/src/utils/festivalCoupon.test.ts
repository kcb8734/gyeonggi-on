import assert from 'node:assert/strict';
import { test } from 'node:test';
import { festivalHasCoupon } from './festivalCoupon';

test('hasCoupon flag wins', () => {
  assert.equal(festivalHasCoupon({ title: '수원화성문화제', hasCoupon: true }, []), true);
  assert.equal(festivalHasCoupon({ title: '수원화성문화제' }, []), false);
});

test('matches promotion by festival id or title', () => {
  assert.equal(
    festivalHasCoupon(
      { id: 'tour-123', title: '수원화성문화제' },
      [{ festival_id: 'tour-123', remaining_quantity: 3 }],
    ),
    true,
  );
  assert.equal(
    festivalHasCoupon(
      { id: 'tour-999', title: '수원화성문화제' },
      [{ festival_title: '수원화성', remaining_quantity: 1 }],
    ),
    true,
  );
  assert.equal(
    festivalHasCoupon(
      { id: 'tour-999', title: '수원화성문화제' },
      [{ festival_title: '보령머드', remaining_quantity: 1 }],
    ),
    false,
  );
});

test('sold-out promotions do not count', () => {
  assert.equal(
    festivalHasCoupon(
      { id: 'a', title: '축제' },
      [{ festival_id: 'a', remaining_quantity: 0 }],
    ),
    false,
  );
});
