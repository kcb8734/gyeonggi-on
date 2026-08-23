import { useEffect, useState } from 'react';
import type { HomeFestival, HomePromotion, QrScanRecord } from '../types/home';
import type { LocalCurrencyCoupon } from '../api/feeds';
import { matchingAmountWon } from '../utils/settlementMail';
import { readJson, writeJson } from '../utils/storage';

export type AttendanceProofKind = 'qr' | 'venue' | 'upload';

export interface WalletCoupon {
  id: string;
  promotion_id: string;
  coupon_code: string;
  business_name: string;
  title: string;
  festival_title?: string | null;
  total_discount_rate: number;
  funding_type?: 'MERCHANT_ONLY' | 'MATCHED';
  expires_at?: string;
  status: 'ISSUED' | 'USED';
  proofImageUrl?: string;
  shopAddress?: string;
  municipality_name?: string | null;
  metro?: string;
}

export interface ScheduledFestival {
  id: string;
  title: string;
  start_date?: string;
  end_date?: string;
  location_name?: string | null;
  remindAt: string;
}

interface AppState {
  wallet: WalletCoupon[];
  schedule: ScheduledFestival[];
  recent: HomeFestival[];
  favorites: HomeFestival[];
  points: number;
  localCoupons: LocalCurrencyCoupon[];
  localPromotions: HomePromotion[];
  localFestivals: HomeFestival[];
  attendanceProofUrl?: string;
  attendanceProofAt?: string;
  attendanceProofKind?: AttendanceProofKind;
}

const KEY = 'gyeonggi-on-app-state';

const SEEDED_WALLET: WalletCoupon[] = [
  {
    id: 'preview-wallet-1',
    promotion_id: 'dddddddd-dddd-4ddd-8ddd-dddddddd0001',
    coupon_code: 'GGON-SW-1042',
    business_name: '화성행궁 한정식',
    title: '수원화성문화제 제휴 한정식 할인',
    festival_title: '수원화성문화제',
    total_discount_rate: 10,
    funding_type: 'MATCHED',
    expires_at: '2026-09-21',
    status: 'ISSUED',
    proofImageUrl: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=800&q=80',
    shopAddress: '경기도 수원시 팔달구 정조로 825',
    municipality_name: '수원시',
    metro: 'GYEONGGI',
  },
];

const INITIAL: AppState = {
  wallet: SEEDED_WALLET,
  schedule: [],
  recent: [],
  favorites: [],
  points: 1280,
  localPromotions: [],
  localFestivals: [],
  attendanceProofUrl: undefined,
  attendanceProofAt: undefined,
  attendanceProofKind: undefined,
  localCoupons: [
    {
      id: 'lc-seed-1',
      title: '수원화성문화제 지역화폐 1,000원',
      amount: 1000,
      kind: 'LOCAL_CURRENCY',
      festivalId: '1000001',
      festivalTitle: '수원화성문화제',
      issuedAt: '2026-08-21T12:00:00.000Z',
    },
  ],
};

type Listener = () => void;
const loaded = readJson<Partial<AppState>>(KEY, INITIAL);
let state: AppState = {
  ...INITIAL,
  ...loaded,
  wallet: loaded.wallet ?? INITIAL.wallet,
  localCoupons: loaded.localCoupons ?? INITIAL.localCoupons,
  localPromotions: loaded.localPromotions ?? INITIAL.localPromotions,
  localFestivals: loaded.localFestivals ?? INITIAL.localFestivals,
  points: loaded.points ?? INITIAL.points,
  attendanceProofUrl: loaded.attendanceProofUrl,
  attendanceProofAt: loaded.attendanceProofAt,
  attendanceProofKind: loaded.attendanceProofKind,
};
const listeners = new Set<Listener>();

function emit(next: AppState) {
  state = next;
  writeJson(KEY, state);
  listeners.forEach((fn) => fn());
}

export function getAppState(): AppState {
  return state;
}

export function useAppState(): AppState {
  const [value, setValue] = useState(state);
  useEffect(() => {
    const listen = () => setValue(getAppState());
    listeners.add(listen);
    return () => {
      listeners.delete(listen);
    };
  }, []);
  return value;
}

export function addWalletCoupon(coupon: WalletCoupon) {
  const exists = state.wallet.some((item) => item.coupon_code === coupon.coupon_code);
  emit({
    ...state,
    wallet: exists ? state.wallet : [coupon, ...state.wallet],
    points: state.points + 30,
  });
}

export function addSchedule(festival: HomeFestival) {
  const exists = state.schedule.some((item) => item.id === festival.id);
  if (exists) return;
  emit({
    ...state,
    schedule: [
      {
        id: festival.id,
        title: festival.title,
        start_date: festival.start_date,
        end_date: festival.end_date,
        location_name: festival.location_name,
        remindAt: festival.start_date ?? '',
      },
      ...state.schedule,
    ],
  });
}

export function isScheduled(id: string): boolean {
  return state.schedule.some((item) => item.id === id);
}

export function rememberFestival(festival: HomeFestival) {
  const next = [festival, ...state.recent.filter((item) => item.id !== festival.id)].slice(0, 8);
  emit({ ...state, recent: next });
}

export function toggleFavorite(festival: HomeFestival) {
  const exists = state.favorites.some((item) => item.id === festival.id);
  emit({
    ...state,
    favorites: exists
      ? state.favorites.filter((item) => item.id !== festival.id)
      : [festival, ...state.favorites],
  });
}

export function isFavorite(id: string): boolean {
  return state.favorites.some((item) => item.id === id);
}

export function addPoints(amount: number) {
  if (!Number.isFinite(amount) || amount === 0) return;
  emit({ ...state, points: Math.max(0, state.points + amount) });
}

export function addLocalCurrencyCoupon(coupon: LocalCurrencyCoupon) {
  const exists = state.localCoupons.some((item) => item.id === coupon.id);
  emit({
    ...state,
    localCoupons: exists ? state.localCoupons : [coupon, ...state.localCoupons],
  });
}

export function syncRewardBalance(points: number, coupons: LocalCurrencyCoupon[]) {
  emit({
    ...state,
    points: Math.max(state.points, points),
    localCoupons: coupons.length ? coupons : state.localCoupons,
  });
}

export function addLocalFestival(festival: HomeFestival) {
  const exists = state.localFestivals.some((item) => item.id === festival.id);
  emit({
    ...state,
    localFestivals: exists
      ? state.localFestivals.map((item) => (item.id === festival.id ? festival : item))
      : [festival, ...state.localFestivals],
  });
}

export function addLocalPromotion(promo: HomePromotion) {
  const exists = state.localPromotions.some((item) => item.id === promo.id);
  emit({
    ...state,
    localPromotions: exists
      ? state.localPromotions.map((item) => (item.id === promo.id ? promo : item))
      : [promo, ...state.localPromotions],
  });
}

export function incrementPromotionQr(id: string, scan?: Partial<QrScanRecord>) {
  const at = scan?.at ?? new Date().toISOString();
  emit({
    ...state,
    localPromotions: state.localPromotions.map((item) => {
      if (item.id !== id) return item;
      const perUse = scan?.amountWon ?? matchingAmountWon({
        maxDiscountAmount: item.maxDiscountAmount ?? 5000,
        govRate: item.gov_matching_rate,
        qrCount: 1,
      }).perUse;
      const existing = item.qrScans ?? [];
      const padded = existing.length
        ? existing
        : Array.from({ length: item.qrConfirmCount ?? 0 }, () => ({
          at: item.lastQrAt ?? at,
          amountWon: perUse,
        }));
      const qrScans = [...padded, { at, amountWon: perUse }];
      return {
        ...item,
        qrConfirmCount: qrScans.length,
        lastQrAt: at,
        qrScans,
      };
    }),
  });
}

export function settlePromotion(id: string, amountWon: number) {
  emit({
    ...state,
    localPromotions: state.localPromotions.map((item) =>
      item.id === id
        ? {
          ...item,
          settledAt: item.settledAt ?? new Date().toISOString(),
          settlementAmount: item.settlementAmount ?? amountWon,
        }
        : item,
    ),
  });
}

export function setAttendanceProof(url: string, kind: AttendanceProofKind) {
  emit({
    ...state,
    attendanceProofUrl: url,
    attendanceProofAt: new Date().toISOString(),
    attendanceProofKind: kind,
  });
}

export function promotionToWallet(promo: HomePromotion, couponCode: string, proofImageUrl?: string): WalletCoupon {
  return {
    id: `${promo.id}-${couponCode}`,
    promotion_id: promo.id,
    coupon_code: couponCode,
    business_name: promo.business_name ?? '제휴업소',
    title: promo.title,
    festival_title: promo.festival_title,
    total_discount_rate: promo.total_discount_rate,
    funding_type: promo.funding_type,
    expires_at: '2026-09-30',
    status: 'ISSUED',
    proofImageUrl: proofImageUrl ?? promo.exterior_image_url ?? undefined,
    shopAddress: promo.address ?? undefined,
    municipality_name: promo.municipality_name,
    metro: promo.metro,
  };
}
