export type CouponFestival = {
  id?: string;
  title?: string;
  hasCoupon?: boolean;
};

export type CouponPromotion = {
  id?: string;
  festival_id?: string | null;
  festival_title?: string | null;
  remaining_quantity?: number;
  is_sample?: boolean;
};

/** 권역 견본(샘플) 쿠폰인지. 리스트 뱃지는 이것에만 쓴다. */
export function isSamplePromotion(promo: CouponPromotion): boolean {
  if (promo.is_sample) return true;
  const id = String(promo.id || '');
  return /^(off|self)-[A-Z0-9]+-/.test(id)
    || id === 'self-funded-preview'
    || /^dddddddd-dddd-4ddd/.test(id);
}

function titlesMatch(festivalTitle: string, linkedTitle: string) {
  const title = festivalTitle.trim();
  const linked = linkedTitle.trim();
  if (!title || !linked) return false;
  if (title === linked) return true;
  if (linked.length >= 6 && title.includes(linked)) return true;
  if (title.length >= 6 && linked.includes(title)) return true;
  return false;
}

/** 축제와 연계된 활성 상가 쿠폰이 있으면 true */
export function festivalHasCoupon(festival: CouponFestival, promotions: CouponPromotion[] = []): boolean {
  if (festival.hasCoupon) return true;
  const title = String(festival.title || '');
  const id = String(festival.id || '');
  return promotions.some((promo) => {
    if ((promo.remaining_quantity ?? 1) <= 0) return false;
    if (promo.festival_id && (promo.festival_id === id || `tour-${promo.festival_id}` === id)) return true;
    const linked = String(promo.festival_title || '');
    if (!linked || !title) return false;
    return title.includes(linked) || linked.includes(title.slice(0, 4));
  });
}

/** 권역별로 견본 발행된 쿠폰이 이 축제에 붙어 있을 때만 true */
export function festivalHasSampleCoupon(festival: CouponFestival, promotions: CouponPromotion[] = []): boolean {
  const title = String(festival.title || '');
  const id = String(festival.id || '');
  return promotions.some((promo) => {
    if (!isSamplePromotion(promo)) return false;
    if ((promo.remaining_quantity ?? 1) <= 0) return false;
    if (promo.festival_id && (promo.festival_id === id || `tour-${promo.festival_id}` === id)) return true;
    return titlesMatch(title, String(promo.festival_title || ''));
  });
}
