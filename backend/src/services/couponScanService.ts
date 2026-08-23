import { tryQuery } from '../db/pool';
import type { CouponScanRecord } from '../types/couponScan';
import { isIssuedCouponCode, normalizeCouponCode } from '../utils/couponToken';
import { AppError } from '../utils/errors';
import { enrollMemoryCoupon, memoryCoupons } from './inMemoryPlatform';

export type { CouponScanRecord };

function mapCouponRow(row: Record<string, unknown>, source: CouponScanRecord['source']): CouponScanRecord {
  return {
    id: String(row.id),
    code: String(row.code ?? row.coupon_code ?? ''),
    title: String(row.title ?? '모바일 쿠폰'),
    discountAmount: Number(row.discount_amount ?? 0),
    municipalityId: row.municipality_id ? String(row.municipality_id) : null,
    merchantId: row.merchant_id ? String(row.merchant_id) : null,
    isUsed: Boolean(row.is_used),
    usedAt: row.used_at ? new Date(String(row.used_at)).toISOString() : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
    settlementId: row.settlement_id ? String(row.settlement_id) : null,
    source,
  };
}

async function findInDatabase(code: string): Promise<CouponScanRecord | null> {
  const token = String(code ?? '').trim();
  const fromCoupons = await tryQuery(
    `SELECT id, code, title, discount_amount, municipality_id, merchant_id, is_used, used_at, expires_at, settlement_id
     FROM coupons WHERE code = $1 LIMIT 1`,
    [token],
  );
  if (fromCoupons?.rows[0]) return mapCouponRow(fromCoupons.rows[0], 'coupons');

  const fromUser = await tryQuery(
    `SELECT uc.id,
            uc.coupon_code AS code,
            COALESCE(NULLIF(uc.title, ''), dp.title, '모바일 쿠폰') AS title,
            COALESCE(uc.discount_amount, dp.max_discount_amount, 0)::int AS discount_amount,
            COALESCE(uc.municipality_id, m.municipality_id) AS municipality_id,
            COALESCE(uc.merchant_id, dp.merchant_id) AS merchant_id,
            CASE WHEN COALESCE(uc.is_used, FALSE) OR uc.status = 'USED' THEN TRUE ELSE FALSE END AS is_used,
            uc.used_at,
            COALESCE(uc.expires_at, dp.end_time) AS expires_at,
            uc.settlement_id
     FROM user_coupons uc
     LEFT JOIN discount_promotions dp ON dp.id = uc.promotion_id
     LEFT JOIN merchants m ON m.id = COALESCE(uc.merchant_id, dp.merchant_id)
     WHERE uc.coupon_code = $1
     LIMIT 1`,
    [token],
  );
  if (fromUser?.rows[0]) return mapCouponRow(fromUser.rows[0], 'user_coupons');
  return null;
}

export async function findCouponByCode(code: string): Promise<CouponScanRecord | null> {
  const token = normalizeCouponCode(code);
  if (!token) return null;
  const fromDb = await findInDatabase(token);
  if (fromDb) return fromDb;
  const fromDbRaw = token === String(code ?? '').trim() ? null : await findInDatabase(String(code ?? '').trim());
  if (fromDbRaw) return fromDbRaw;
  return memoryCoupons.find((item) => item.code.toUpperCase() === token) ?? null;
}

export function validateCouponStatus(coupon: CouponScanRecord) {
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    throw new AppError(410, '만료된 쿠폰입니다.');
  }
  if (coupon.isUsed) {
    throw new AppError(409, '이미 사용된 쿠폰입니다.');
  }
}

export async function verifyCouponCode(code: string): Promise<CouponScanRecord> {
  const token = normalizeCouponCode(code);
  if (!token) throw new AppError(400, '쿠폰 QR이 아닙니다. 손님 쿠폰함의 QR을 스캔해 주세요.');
  if (!isIssuedCouponCode(token) && !(await findCouponByCode(token))) {
    throw new AppError(400, '쿠폰 QR이 아닙니다. 손님 쿠폰함의 QR을 스캔해 주세요.');
  }
  let coupon = await findCouponByCode(token);
  if (!coupon && isIssuedCouponCode(token)) {
    coupon = enrollMemoryCoupon(token);
    await tryQuery(
      `INSERT INTO coupons (code, title, discount_amount, is_used, expires_at)
       VALUES ($1, $2, $3, FALSE, NOW() + INTERVAL '40 days')
       ON CONFLICT (code) DO NOTHING`,
      [token, coupon.title, coupon.discountAmount],
    );
  }
  if (!coupon) throw new AppError(404, '등록되지 않은 쿠폰 코드입니다.');
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    throw new AppError(410, '만료된 쿠폰입니다.');
  }
  return coupon;
}

export async function useCouponCode(code: string, merchantId?: string | null): Promise<CouponScanRecord> {
  const coupon = await verifyCouponCode(code);
  if (coupon.isUsed) {
    throw new AppError(409, '이미 사용된 쿠폰입니다.');
  }

  const now = new Date().toISOString();
  if (coupon.source === 'coupons') {
    await tryQuery(
      `UPDATE coupons SET is_used = TRUE, used_at = $2, merchant_id = COALESCE(merchant_id, $3)
       WHERE id = $1`,
      [coupon.id, now, merchantId ?? coupon.merchantId],
    );
  } else {
    await tryQuery(
      `UPDATE user_coupons
       SET is_used = TRUE, status = 'USED', used_at = $2, merchant_id = COALESCE(merchant_id, $3)
       WHERE id = $1`,
      [coupon.id, now, merchantId ?? coupon.merchantId],
    );
  }
  const memory = memoryCoupons.find((item) => item.id === coupon.id || item.code.toUpperCase() === coupon.code.toUpperCase());
  if (memory) {
    memory.isUsed = true;
    memory.usedAt = now;
    memory.merchantId = merchantId ?? memory.merchantId;
  }
  return { ...coupon, isUsed: true, usedAt: now, merchantId: merchantId ?? coupon.merchantId };
}

export async function listUnsettledUsedCoupons(merchantId?: string) {
  const items: CouponScanRecord[] = [];
  const params: unknown[] = [];
  const merchantFilter = merchantId ? (params.push(merchantId), 'AND merchant_id = $1') : '';

  const coupons = await tryQuery(
    `SELECT id, code, title, discount_amount, municipality_id, merchant_id, is_used, used_at, expires_at, settlement_id
     FROM coupons
     WHERE is_used = TRUE AND settlement_id IS NULL ${merchantFilter}
     ORDER BY used_at DESC NULLS LAST`,
    params,
  );
  const userCoupons = await tryQuery(
    `SELECT uc.id,
            uc.coupon_code AS code,
            COALESCE(NULLIF(uc.title, ''), dp.title, '모바일 쿠폰') AS title,
            COALESCE(uc.discount_amount, dp.max_discount_amount, 0)::int AS discount_amount,
            COALESCE(uc.municipality_id, m.municipality_id) AS municipality_id,
            COALESCE(uc.merchant_id, dp.merchant_id) AS merchant_id,
            TRUE AS is_used,
            uc.used_at,
            COALESCE(uc.expires_at, dp.end_time) AS expires_at,
            uc.settlement_id
     FROM user_coupons uc
     LEFT JOIN discount_promotions dp ON dp.id = uc.promotion_id
     LEFT JOIN merchants m ON m.id = COALESCE(uc.merchant_id, dp.merchant_id)
     WHERE (COALESCE(uc.is_used, FALSE) OR uc.status = 'USED')
       AND uc.settlement_id IS NULL
       ${merchantId ? 'AND COALESCE(uc.merchant_id, dp.merchant_id) = $1' : ''}
     ORDER BY uc.used_at DESC NULLS LAST`,
    params,
  );
  if (coupons?.rows.length) items.push(...coupons.rows.map((row) => mapCouponRow(row, 'coupons')));
  if (userCoupons?.rows.length) items.push(...userCoupons.rows.map((row) => mapCouponRow(row, 'user_coupons')));
  if (items.length) return items;

  return memoryCoupons.filter((item) => (
    item.isUsed
    && !item.settlementId
    && (!merchantId || item.merchantId === merchantId)
  ));
}
