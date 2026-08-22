import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FEED_REWARD_POINTS,
  getRewardBalance,
  grantFeedReward,
  hasGrantedToday,
  resetRewardLedger,
} from './rewardService';

test('feed reward grants 1000P and a local-currency coupon once per festival per day', () => {
  resetRewardLedger();
  const first = grantFeedReward({
    userId: 'user-1',
    festivalId: 'fest-1',
    festivalTitle: '수원화성문화제',
  }, new Date('2026-08-22T10:00:00.000Z'));

  assert.equal(first.awarded, true);
  assert.equal(first.points, FEED_REWARD_POINTS);
  assert.equal(first.matching?.municipality, FEED_REWARD_POINTS);
  assert.equal(first.coupon?.kind, 'LOCAL_CURRENCY');
  assert.equal(first.balance.points, 1000);
  assert.equal(first.balance.coupons.length, 1);
  assert.equal(hasGrantedToday('user-1', 'fest-1', new Date('2026-08-22T18:00:00.000Z')), true);

  const second = grantFeedReward({
    userId: 'user-1',
    festivalId: 'fest-1',
    festivalTitle: '수원화성문화제',
  }, new Date('2026-08-22T20:00:00.000Z'));
  assert.equal(second.awarded, false);
  assert.equal(second.reason, 'DAILY_LIMIT');
  assert.equal(second.balance.points, 1000);

  const otherFestival = grantFeedReward({
    userId: 'user-1',
    festivalId: 'fest-2',
    festivalTitle: '자라섬 재즈',
  }, new Date('2026-08-22T21:00:00.000Z'));
  assert.equal(otherFestival.awarded, true);
  assert.equal(getRewardBalance('user-1').points, 2000);
});
