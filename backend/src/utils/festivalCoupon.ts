export type CouponFestival = {
  id?: string;
  title?: string;
  hasCoupon?: boolean;
};

export type CouponPromotion = {
  festival_id?: string | null;
  festival_title?: string | null;
  remaining_quantity?: number;
};

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
