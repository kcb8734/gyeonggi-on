export const FEED_REWARD_POINTS = 1000;
export const LOCAL_CURRENCY_COUPON_AMOUNT = 1000;

export interface LocalCurrencyCoupon {
  id: string;
  title: string;
  amount: number;
  kind: 'LOCAL_CURRENCY';
  festivalId: string;
  festivalTitle: string;
  issuedAt: string;
}

export interface RewardBalance {
  userId: string;
  points: number;
  coupons: LocalCurrencyCoupon[];
}

export interface FeedRewardGrant {
  userId: string;
  festivalId: string;
  festivalTitle: string;
  grantedAt: string;
  dayKey: string;
  points: number;
  coupon: LocalCurrencyCoupon;
  matching: { user: number; municipality: number };
}

export interface GrantFeedRewardInput {
  userId: string;
  festivalId: string;
  festivalTitle: string;
}

export interface GrantFeedRewardResult {
  awarded: boolean;
  reason?: 'DAILY_LIMIT';
  points: number;
  coupon?: LocalCurrencyCoupon;
  matching?: { user: number; municipality: number };
  badge: '지자체 지원 리워드 지급완료' | '지자체 1:1 매칭 피드';
  balance: RewardBalance;
}

const grants: FeedRewardGrant[] = [];
const balances = new Map<string, RewardBalance>();

function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function ensureBalance(userId: string): RewardBalance {
  const existing = balances.get(userId);
  if (existing) return existing;
  const created: RewardBalance = { userId, points: 0, coupons: [] };
  balances.set(userId, created);
  return created;
}

export function getRewardBalance(userId: string): RewardBalance {
  return { ...ensureBalance(userId), coupons: [...ensureBalance(userId).coupons] };
}

export function hasGrantedToday(userId: string, festivalId: string, now = new Date()): boolean {
  const day = todayKey(now);
  return grants.some(
    (item) => item.userId === userId && item.festivalId === festivalId && item.dayKey === day,
  );
}

export function grantFeedReward(input: GrantFeedRewardInput, now = new Date()): GrantFeedRewardResult {
  const userId = String(input.userId || '').trim();
  const festivalId = String(input.festivalId || '').trim();
  const festivalTitle = String(input.festivalTitle || '').trim() || '축제';
  if (!userId || !festivalId) {
    throw new Error('userId와 festivalId가 필요합니다.');
  }

  const balance = ensureBalance(userId);
  if (hasGrantedToday(userId, festivalId, now)) {
    return {
      awarded: false,
      reason: 'DAILY_LIMIT',
      points: 0,
      badge: '지자체 1:1 매칭 피드',
      balance: getRewardBalance(userId),
    };
  }

  const issuedAt = now.toISOString();
  const coupon: LocalCurrencyCoupon = {
    id: `lc-${userId.slice(0, 8)}-${Date.now()}`,
    title: `${festivalTitle} 지역화폐 ${LOCAL_CURRENCY_COUPON_AMOUNT.toLocaleString()}원`,
    amount: LOCAL_CURRENCY_COUPON_AMOUNT,
    kind: 'LOCAL_CURRENCY',
    festivalId,
    festivalTitle,
    issuedAt,
  };

  const grant: FeedRewardGrant = {
    userId,
    festivalId,
    festivalTitle,
    grantedAt: issuedAt,
    dayKey: todayKey(now),
    points: FEED_REWARD_POINTS,
    coupon,
    matching: { user: FEED_REWARD_POINTS, municipality: FEED_REWARD_POINTS },
  };
  grants.push(grant);
  balance.points += FEED_REWARD_POINTS;
  balance.coupons = [coupon, ...balance.coupons];

  return {
    awarded: true,
    points: FEED_REWARD_POINTS,
    coupon,
    matching: grant.matching,
    badge: '지자체 지원 리워드 지급완료',
    balance: getRewardBalance(userId),
  };
}

/** 테스트용 */
export function resetRewardLedger() {
  grants.length = 0;
  balances.clear();
}
