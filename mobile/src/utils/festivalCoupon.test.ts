import assert from 'node:assert/strict';
import { test } from 'node:test';
import { festivalHasCoupon, festivalHasSampleCoupon } from './festivalCoupon';
import { fallbackPromotions } from '../constants/regionTour';

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

test('리스트 뱃지는 권역 견본 쿠폰에만 붙는다', () => {
  const sample = { id: 'off-GYEONGGI-fest-1', festival_title: '수원화성문화제', remaining_quantity: 2, is_sample: true };
  assert.equal(festivalHasSampleCoupon({ title: '수원화성문화제' }, [sample]), true);
  assert.equal(festivalHasSampleCoupon({ title: '안산별망성축제' }, [sample]), false);
  assert.equal(
    festivalHasSampleCoupon(
      { title: '안산별망성축제', hasCoupon: true },
      [{ festival_title: '안산별망성축제', remaining_quantity: 2 }],
    ),
    false,
  );
  const samples = fallbackPromotions('SEOUL');
  assert.equal(samples.length, 1);
  assert.equal(samples[0].is_sample, true);
  assert.equal(festivalHasSampleCoupon({ title: samples[0].festival_title || '' }, samples), true);
});
