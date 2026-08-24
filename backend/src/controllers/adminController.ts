import { Request, Response } from 'express';
import { pool } from '../db/pool';
import {
  deleteFestivalOverride,
  listFestivalOverrides,
  upsertFestivalOverride,
} from '../services/festivalOverrideStore';

const GOV_MATCHING_CAP_RATE = 10.0;

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** GET /api/admin/merchants — 국세청 검증 통과 가맹점 + 프로모션 신청 목록 */
export const listVerifiedMerchants = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
         m.id,
         m.business_name,
         m.business_number,
         m.category,
         m.address,
         m.is_verified,
         m.nts_b_stt_cd,
         m.nts_verified_at,
         mu.name AS municipality_name,
         mu.region_code,
         dp.id AS promotion_id,
         dp.title AS promotion_title,
         dp.merchant_discount_rate,
         dp.gov_matching_rate,
         dp.total_discount_rate,
         dp.funding_type,
         dp.matching_status,
         dp.status AS promotion_status,
         dp.total_quantity,
         dp.remaining_quantity,
         f.title AS festival_title
       FROM merchants m
       LEFT JOIN municipalities mu ON mu.id = m.municipality_id
       LEFT JOIN discount_promotions dp ON dp.merchant_id = m.id
       LEFT JOIN festivals f ON f.id = dp.festival_id
       WHERE m.is_verified = TRUE
       ORDER BY
         CASE dp.matching_status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END,
         m.created_at DESC,
         dp.created_at DESC`,
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[listVerifiedMerchants] Error:', err);
    return res.status(500).json({ success: false, message: '가맹점 목록을 불러오지 못했습니다.' });
  }
};

/** POST /api/admin/merchants/:id/approve — 지자체 1:1 매칭 승인/거절 */
export const approveMerchantMatching = async (req: Request, res: Response) => {
  const merchantId = req.params.id;
  const action = String(req.body?.action ?? 'APPROVE').toUpperCase();
  const promotionId = typeof req.body?.promotion_id === 'string' ? req.body.promotion_id : null;

  if (action !== 'APPROVE' && action !== 'REJECT') {
    return res.status(400).json({ success: false, message: 'action은 APPROVE 또는 REJECT 여야 합니다.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const promoResult = await client.query(
      `SELECT dp.*, m.municipality_id
       FROM discount_promotions dp
       JOIN merchants m ON m.id = dp.merchant_id
       WHERE m.id = $1
         AND m.is_verified = TRUE
         AND ($2::uuid IS NULL OR dp.id = $2)
         AND dp.matching_status = 'PENDING'
       ORDER BY dp.created_at ASC
       FOR UPDATE OF dp`,
      [merchantId, promotionId],
    );

    if (promoResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: '승인 대기 중인 매칭 신청을 찾을 수 없습니다.' });
    }

    const updated = [];
    for (const promo of promoResult.rows) {
      if (action === 'REJECT') {
        const row = await client.query(
          `UPDATE discount_promotions
           SET matching_status = 'REJECTED', gov_matching_rate = 0
           WHERE id = $1
           RETURNING *`,
          [promo.id],
        );
        updated.push(row.rows[0]);
        continue;
      }

      const municipality = await client.query(
        `SELECT id, budget_balance FROM municipalities WHERE id = $1 FOR UPDATE`,
        [promo.municipality_id],
      );
      const budgetBalance = toNumber(municipality.rows[0]?.budget_balance);
      const merchantRate = toNumber(promo.merchant_discount_rate);
      const requestedGovRate = Math.min(merchantRate, GOV_MATCHING_CAP_RATE);
      const totalRateIfMatched = merchantRate + requestedGovRate;
      const govShareRatio = totalRateIfMatched > 0 ? requestedGovRate / totalRateIfMatched : 0;
      const estimatedGovExposure = toNumber(promo.max_discount_amount) * govShareRatio * toNumber(promo.total_quantity);

      let appliedGovRate = 0;
      if (budgetBalance > 0 && estimatedGovExposure <= budgetBalance) {
        appliedGovRate = requestedGovRate;
      } else if (budgetBalance > 0 && estimatedGovExposure > 0) {
        appliedGovRate = Math.floor(requestedGovRate * (budgetBalance / estimatedGovExposure) * 100) / 100;
      }

      const row = await client.query(
        `UPDATE discount_promotions
         SET matching_status = 'APPROVED',
             funding_type = 'MATCHED',
             gov_matching_rate = $2
         WHERE id = $1
         RETURNING *`,
        [promo.id, appliedGovRate],
      );
      updated.push(row.rows[0]);
    }

    await client.query('COMMIT');
    return res.json({
      success: true,
      message: action === 'APPROVE' ? '지자체 1:1 매칭이 승인되었습니다.' : '매칭 신청이 거절되었습니다.',
      data: updated,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[approveMerchantMatching] Error:', err);
    return res.status(500).json({ success: false, message: '매칭 승인 처리 중 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
};

/** GET /api/admin/coupons/stats — 축제/가맹점별 발행·사용 통계 */
export const getCouponStats = async (_req: Request, res: Response) => {
  try {
    const summary = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE uc.id IS NOT NULL) AS issued_count,
         COUNT(*) FILTER (WHERE uc.status = 'USED') AS used_count,
         COALESCE(SUM(st.merchant_discount_amount), 0) AS merchant_discount_total,
         COALESCE(SUM(st.gov_support_amount), 0) AS gov_support_total,
         COALESCE(SUM(st.merchant_discount_amount + st.gov_support_amount), 0) AS total_discount_amount
       FROM user_coupons uc
       LEFT JOIN settlement_transactions st ON st.user_coupon_id = uc.id`,
    );

    const byFestival = await pool.query(
      `SELECT
         f.id AS festival_id,
         f.title AS festival_title,
         COUNT(DISTINCT dp.merchant_id) AS merchant_count,
         COUNT(uc.id) FILTER (WHERE uc.status = 'USED') AS used_count,
         COUNT(uc.id) AS issued_count,
         COALESCE(SUM(st.merchant_discount_amount), 0) AS merchant_burden,
         COALESCE(SUM(st.gov_support_amount), 0) AS gov_support,
         CASE
           WHEN COUNT(st.id) = 0 THEN '없음'
           WHEN COUNT(*) FILTER (WHERE st.settlement_status = 'PENDING') > 0 THEN 'PENDING'
           ELSE 'COMPLETED'
         END AS settlement_status
       FROM festivals f
       LEFT JOIN discount_promotions dp ON dp.festival_id = f.id
       LEFT JOIN user_coupons uc ON uc.promotion_id = dp.id
       LEFT JOIN settlement_transactions st ON st.user_coupon_id = uc.id
       GROUP BY f.id, f.title
       ORDER BY f.title`,
    );

    const selfFunded = await pool.query(
      `SELECT
         COUNT(uc.id) AS issued_count,
         COUNT(uc.id) FILTER (WHERE uc.status = 'USED') AS used_count,
         COALESCE(SUM(st.merchant_discount_amount), 0) AS merchant_discount_total
       FROM discount_promotions dp
       LEFT JOIN user_coupons uc ON uc.promotion_id = dp.id
       LEFT JOIN settlement_transactions st ON st.user_coupon_id = uc.id
       WHERE dp.funding_type = 'MERCHANT_ONLY'`,
    );

    const byMerchant = await pool.query(
      `SELECT
         m.id AS merchant_id,
         m.business_name,
         dp.funding_type,
         COUNT(uc.id) AS issued_count,
         COUNT(uc.id) FILTER (WHERE uc.status = 'USED') AS used_count
       FROM merchants m
       LEFT JOIN discount_promotions dp ON dp.merchant_id = m.id
       LEFT JOIN user_coupons uc ON uc.promotion_id = dp.id
       GROUP BY m.id, m.business_name, dp.funding_type
       ORDER BY m.business_name`,
    );

    return res.json({
      success: true,
      data: {
        summary: {
          issued_count: toNumber(summary.rows[0]?.issued_count),
          used_count: toNumber(summary.rows[0]?.used_count),
          merchant_discount_total: toNumber(summary.rows[0]?.merchant_discount_total),
          gov_support_total: toNumber(summary.rows[0]?.gov_support_total),
          total_discount_amount: toNumber(summary.rows[0]?.total_discount_amount),
        },
        self_funded: {
          issued_count: toNumber(selfFunded.rows[0]?.issued_count),
          used_count: toNumber(selfFunded.rows[0]?.used_count),
          merchant_discount_total: toNumber(selfFunded.rows[0]?.merchant_discount_total),
        },
        by_festival: byFestival.rows,
        by_merchant: byMerchant.rows,
      },
    });
  } catch (err) {
    console.error('[getCouponStats] Error:', err);
    return res.status(500).json({ success: false, message: '쿠폰 통계를 불러오지 못했습니다.' });
  }
};

/** GET /api/admin/budget — 지자체별 예산 잔액·집행률 */
export const getBudgetOverview = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         name,
         region_code,
         metro_region,
         budget_balance,
         COALESCE(initial_budget, budget_balance) AS initial_budget,
         CASE
           WHEN COALESCE(initial_budget, budget_balance) > 0
           THEN ROUND(((COALESCE(initial_budget, budget_balance) - budget_balance)
             / COALESCE(initial_budget, budget_balance)) * 100, 2)
           ELSE 0
         END AS execution_rate
       FROM municipalities
       ORDER BY name`,
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[getBudgetOverview] Error:', err);
    return res.status(500).json({ success: false, message: '예산 현황을 불러오지 못했습니다.' });
  }
};

/** GET /api/admin/festivals — TourAPI 보완용 수동 축제 */
export const listAdminFestivals = async (_req: Request, res: Response) => {
  return res.json({ success: true, data: listFestivalOverrides() });
};

/** POST /api/admin/festivals — 지자체 자체 행사 추가/수정 */
export const upsertAdminFestival = async (req: Request, res: Response) => {
  try {
    const saved = upsertFestivalOverride({
      contentId: typeof req.body?.contentId === 'string' ? req.body.contentId : undefined,
      title: String(req.body?.title ?? ''),
      overview: req.body?.overview,
      address: req.body?.address,
      tel: req.body?.tel,
      firstImage: req.body?.firstImage,
      mapX: req.body?.mapX != null ? Number(req.body.mapX) : undefined,
      mapY: req.body?.mapY != null ? Number(req.body.mapY) : undefined,
      eventStartDate: req.body?.eventStartDate,
      eventEndDate: req.body?.eventEndDate,
      eventPlace: req.body?.eventPlace,
      fee: req.body?.fee,
      category: req.body?.category,
    });
    return res.json({
      success: true,
      message: 'TourAPI에 없는 행사를 수동 등록했습니다. 앱 상세 화면에 바로 반영됩니다.',
      data: saved,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : '축제 저장에 실패했습니다.',
    });
  }
};

/** DELETE /api/admin/festivals/:contentId */
export const removeAdminFestival = async (req: Request, res: Response) => {
  const removed = deleteFestivalOverride(String(req.params.contentId ?? ''));
  return res.json({ success: removed, message: removed ? '삭제했습니다.' : '해당 행사가 없습니다.' });
};

export const getAdminDashboard = async (_req: Request, res: Response) => {
  const { getAdminDashboard: load } = await import('../services/adminDashboardService');
  const data = await load();
  return res.json({ success: true, data });
};

export const updateAdminEngine = async (req: Request, res: Response) => {
  const { updateEngineWeights } = await import('../services/adminDashboardService');
  const data = await updateEngineWeights(req.body ?? {});
  return res.json({ success: true, data });
};

export const markCoursePick = async (req: Request, res: Response) => {
  const { markEditorsPick } = await import('../services/adminDashboardService');
  const data = await markEditorsPick(String(req.body?.course_id ?? req.params.id ?? ''), req.body?.enabled !== false);
  return res.json({ success: true, data });
};

export const downloadSettlementExcel = async (_req: Request, res: Response) => {
  const { settlementCsv } = await import('../services/adminDashboardService');
  const csv = settlementCsv();
  const body = csv.charCodeAt(0) === 0xFEFF ? csv : `\uFEFF${csv}`;
  const month = new Date().toISOString().slice(0, 7);
  const asciiName = `monthly_settlement_${month}.csv`;
  const filename = `월별정산내역_${month}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(200).send(Buffer.from(body, 'utf8'));
};
