import { GYEONGGI_CITIES } from '../constants/gyeonggiCities';
import type { CouponScanRecord } from '../types/couponScan';

export const DEV_MERCHANT_ID = '22222222-2222-4222-8222-222222222222';
export const YONGIN_MUNI_ID = '33333333-3333-4333-8333-333333333333';

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export const memoryCoupons: CouponScanRecord[] = [
  {
    id: 'coupon-used-1',
    code: 'GYON-USED-0001',
    title: '장단콩 축제 10% 할인',
    discountAmount: 3000,
    municipalityId: YONGIN_MUNI_ID,
    merchantId: DEV_MERCHANT_ID,
    isUsed: true,
    usedAt: hoursAgo(6),
    expiresAt: daysFromNow(20),
    settlementId: null,
    source: 'coupons',
  },
  {
    id: 'coupon-used-2',
    code: 'GYON-USED-0002',
    title: '전통시장 먹거리 쿠폰',
    discountAmount: 2000,
    municipalityId: YONGIN_MUNI_ID,
    merchantId: DEV_MERCHANT_ID,
    isUsed: true,
    usedAt: hoursAgo(30),
    expiresAt: daysFromNow(20),
    settlementId: null,
    source: 'coupons',
  },
  {
    id: 'coupon-used-3',
    code: 'GYON-USED-0003',
    title: '온앤온 현장 결제 할인',
    discountAmount: 4500,
    municipalityId: YONGIN_MUNI_ID,
    merchantId: DEV_MERCHANT_ID,
    isUsed: true,
    usedAt: hoursAgo(80),
    expiresAt: daysFromNow(20),
    settlementId: null,
    source: 'user_coupons',
  },
  {
    id: 'coupon-scan-1',
    code: 'GYON-SCAN-0001',
    title: '온앤온 현장 할인',
    discountAmount: 1500,
    municipalityId: YONGIN_MUNI_ID,
    merchantId: DEV_MERCHANT_ID,
    isUsed: false,
    usedAt: null,
    expiresAt: daysFromNow(40),
    settlementId: null,
    source: 'coupons',
  },
  {
    id: 'coupon-wallet-1',
    code: 'GGON-SW-1042',
    title: '수원화성문화제 제휴 한정식 할인',
    discountAmount: 3000,
    municipalityId: YONGIN_MUNI_ID,
    merchantId: DEV_MERCHANT_ID,
    isUsed: false,
    usedAt: null,
    expiresAt: daysFromNow(40),
    settlementId: null,
    source: 'user_coupons',
  },
];

export function enrollMemoryCoupon(code: string, title?: string, discountAmount?: number): CouponScanRecord {
  const existing = memoryCoupons.find((item) => item.code.toUpperCase() === code.toUpperCase());
  if (existing) return existing;
  const row: CouponScanRecord = {
    id: `auto-${code}`,
    code,
    title: title || '온앤온 모바일 쿠폰',
    discountAmount: discountAmount ?? 3000,
    municipalityId: YONGIN_MUNI_ID,
    merchantId: DEV_MERCHANT_ID,
    isUsed: false,
    usedAt: null,
    expiresAt: daysFromNow(40),
    settlementId: null,
    source: 'coupons',
  };
  memoryCoupons.push(row);
  return row;
}

export const memorySettlements: Array<{
  id: string;
  merchantId: string;
  municipalityId: string;
  totalCount: number;
  totalAmount: number;
  docNumber: string;
  status: 'PENDING' | 'REQUESTED' | 'COMPLETED';
  pdfUrl: string;
  requestedAt: string;
}> = [];

export const memoryEngine = {
  festivalWeight: 40,
  campingDistanceWeight: 25,
  marketRatioWeight: 20,
  historyWeight: 15,
};

export const memoryGuardLogs: Array<{ at: string; text: string; blocked: boolean }> = [
  { at: hoursAgo(12), text: '정상 코스 생성', blocked: false },
];

export const memoryEditorsPicks = new Set<string>();

export function memoryMerchant() {
  return {
    id: DEV_MERCHANT_ID,
    name: '화성행궁 한정식',
    ownerName: '김온앤',
    address: '경기도 용인시 처인구 축제대로 12',
    phone: '031-000-1234',
    businessNumber: '1234567890',
    municipalityId: YONGIN_MUNI_ID,
    bankName: '기업은행',
    accountNumber: '123-456789-01-011',
    accountHolder: '김온앤',
  };
}

export function memoryMunicipality() {
  return {
    id: YONGIN_MUNI_ID,
    name: '용인시',
    mayorName: '용인시장',
    department: '관광과',
    settlementEmail: 'pizon8113@gmail.com',
  };
}

export function matchingMatrix() {
  return GYEONGGI_CITIES.map((name, index) => ({
    city: name,
    officerName: index % 7 === 0 ? '' : `${name.replace(/(시|군)$/, '')} 담당`,
    phone: index % 7 === 0 ? '' : '031-120',
    stores: 4 + (index % 5),
    festivals: 1 + (index % 3),
    coupons: 8 + (index % 11),
    approved: index % 7 !== 0,
  }));
}
