import { Request, Response } from 'express';
import { pool } from '../db/pool';
import {
  fetchBusinessStatus,
  isValidBusinessNumber,
  normalizeBusinessNumber,
  NtsLookupError,
  rejectionMessage,
} from '../services/ntsService';

/**
 * POST /api/merchants/verify
 * 국세청 사업자등록 상태조회로 실체성(계속사업자 01)을 확인하고,
 * merchant_id가 있으면 merchants.is_verified 를 갱신한다.
 */
export const verifyMerchant = async (req: Request, res: Response) => {
  const merchantId = typeof req.body?.merchant_id === 'string' ? req.body.merchant_id : null;
  const businessName = typeof req.body?.business_name === 'string' ? req.body.business_name.trim() : '';
  let businessNumber = typeof req.body?.business_number === 'string' ? req.body.business_number : '';

  try {
    if (merchantId && !businessNumber) {
      const found = await pool.query(
        `SELECT id, business_number, business_name FROM merchants WHERE id = $1`,
        [merchantId],
      );
      if (found.rowCount === 0) {
        return res.status(404).json({ success: false, message: '등록된 소상공인 정보를 찾을 수 없습니다.' });
      }
      businessNumber = found.rows[0].business_number;
    }

    if (!businessNumber) {
      return res.status(400).json({ success: false, message: '사업자등록번호 또는 merchant_id가 필요합니다.' });
    }
    if (!isValidBusinessNumber(businessNumber)) {
      return res.status(400).json({ success: false, message: '사업자등록번호는 숫자 10자리여야 합니다.' });
    }

    const status = await fetchBusinessStatus(businessNumber);
    const verified = status.isActive;

    if (merchantId) {
      await pool.query(
        `UPDATE merchants
         SET is_verified = $2, nts_verified_at = now(), nts_b_stt_cd = $3,
             business_name = COALESCE(NULLIF($4, ''), business_name)
         WHERE id = $1`,
        [merchantId, verified, status.b_stt_cd, businessName],
      );
    } else {
      await pool.query(
        `UPDATE merchants
         SET is_verified = $2, nts_verified_at = now(), nts_b_stt_cd = $3,
             business_name = COALESCE(NULLIF($4, ''), business_name)
         WHERE regexp_replace(business_number, '[^0-9]', '', 'g') = $1`,
        [normalizeBusinessNumber(businessNumber), verified, status.b_stt_cd, businessName],
      );
    }

    return res.status(verified ? 200 : 409).json({
      success: verified,
      message: verified
        ? '국세청 계속사업자로 확인되었습니다. 상가 자체 할인은 바로 등록할 수 있습니다.'
        : rejectionMessage(status),
      data: {
        verified,
        business_name: businessName || null,
        business_number: status.b_no,
        b_stt: status.b_stt,
        b_stt_cd: status.b_stt_cd,
        tax_type: status.tax_type,
        tax_type_cd: status.tax_type_cd,
        end_dt: status.end_dt || null,
      },
    });
  } catch (err) {
    if (err instanceof NtsLookupError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error('[verifyMerchant] Error:', err);
    return res.status(500).json({ success: false, message: '사업자 상태 확인 중 서버 오류가 발생했습니다.' });
  }
};

/** GET /api/merchants/:id/settlement — 가맹점 쿠폰 사용/정산 현황 */
export const getMerchantSettlement = async (req: Request, res: Response) => {
  const merchantId = req.params.id;
  if (!merchantId) {
    return res.status(400).json({ success: false, message: '가맹점 ID가 필요합니다.' });
  }

  try {
    const summary = await pool.query(
      `SELECT
         COUNT(uc.id) AS issued_count,
         COUNT(uc.id) FILTER (WHERE uc.status = 'USED') AS used_count,
         COALESCE(SUM(st.gov_support_amount) FILTER (WHERE st.settlement_status = 'PENDING'), 0) AS pending_amount
       FROM discount_promotions dp
       LEFT JOIN user_coupons uc ON uc.promotion_id = dp.id
       LEFT JOIN settlement_transactions st ON st.user_coupon_id = uc.id
       WHERE dp.merchant_id = $1`,
      [merchantId],
    );

    const rows = await pool.query(
      `SELECT
         dp.id, dp.title,
         COUNT(uc.id) AS issued_count,
         COUNT(uc.id) FILTER (WHERE uc.status = 'USED') AS used_count,
         COALESCE(SUM(st.merchant_discount_amount), 0) AS merchant_discount_total,
         COALESCE(SUM(st.gov_support_amount), 0) AS gov_support_total,
         CASE
           WHEN dp.funding_type = 'MERCHANT_ONLY' THEN '자체 할인 정산 불필요'
           ELSE '정산 대기'
         END AS status
       FROM discount_promotions dp
       LEFT JOIN user_coupons uc ON uc.promotion_id = dp.id
       LEFT JOIN settlement_transactions st ON st.user_coupon_id = uc.id
       WHERE dp.merchant_id = $1
       GROUP BY dp.id, dp.title, dp.funding_type
       ORDER BY dp.created_at DESC`,
      [merchantId],
    );

    return res.json({
      success: true,
      data: {
        issued_count: Number(summary.rows[0]?.issued_count ?? 0),
        used_count: Number(summary.rows[0]?.used_count ?? 0),
        pending_amount: Number(summary.rows[0]?.pending_amount ?? 0),
        rows: rows.rows.map((row) => ({
          ...row,
          issued_count: Number(row.issued_count),
          used_count: Number(row.used_count),
          merchant_discount_total: Number(row.merchant_discount_total),
          gov_support_total: Number(row.gov_support_total),
        })),
      },
    });
  } catch (err) {
    console.error('[getMerchantSettlement] Error:', err);
    return res.status(500).json({ success: false, message: '정산 현황을 불러오지 못했습니다.' });
  }
};
