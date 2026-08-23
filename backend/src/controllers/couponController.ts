import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { generateCouponCode } from '../utils/couponCode';

/**
 * POST /api/coupons/issue
 * 고객이 제휴업소 핀에서 쿠폰을 다운로드(QR 발급)할 때 호출.
 * 이미 ISSUED 쿠폰이 있으면 기존 코드를 그대로 반환(재다운로드).
 */
export const issueCoupon = async (req: Request, res: Response) => {
  const { user_id, promotion_id } = req.body;

  if (!user_id || !promotion_id) {
    return res.status(400).json({ success: false, message: 'user_id와 promotion_id가 필요합니다.' });
  }

  // TODO(보안): req.user(인증 미들웨어에서 주입)의 userId와 body.user_id가
  // 일치하는지 검증하여, 다른 사용자 명의로 쿠폰을 발급하는 것을 방지해야 함.

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const promotionResult = await client.query(
      `SELECT id, status, remaining_quantity, start_time, end_time
       FROM discount_promotions
       WHERE id = $1
       FOR UPDATE`,
      [promotion_id],
    );

    if (promotionResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: '프로모션을 찾을 수 없습니다.' });
    }

    const promotion = promotionResult.rows[0];
    if (promotion.status !== 'ACTIVE' || new Date(promotion.end_time) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(410).json({ success: false, message: '만료되었거나 종료된 프로모션입니다.' });
    }
    if (new Date(promotion.start_time) > new Date()) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: '아직 시작되지 않은 프로모션입니다.' });
    }

    const existing = await client.query(
      `SELECT coupon_code FROM user_coupons
       WHERE user_id = $1 AND promotion_id = $2 AND status = 'ISSUED'
       LIMIT 1`,
      [user_id, promotion_id],
    );

    if ((existing.rowCount ?? 0) > 0) {
      await client.query('COMMIT');
      return res.status(200).json({
        success: true,
        message: '이미 발급된 쿠폰입니다.',
        data: { coupon_code: existing.rows[0].coupon_code, already_issued: true },
      });
    }

    const decrement = await client.query(
      `UPDATE discount_promotions
       SET remaining_quantity = remaining_quantity - 1,
           status = CASE WHEN remaining_quantity <= 1 THEN 'EXHAUSTED' ELSE status END
       WHERE id = $1 AND remaining_quantity > 0 AND status = 'ACTIVE'
       RETURNING remaining_quantity`,
      [promotion_id],
    );

    if (decrement.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: '쿠폰이 모두 소진되었습니다.' });
    }

    const couponCode = generateCouponCode();
    const inserted = await client.query(
      `INSERT INTO user_coupons (user_id, promotion_id, coupon_code, status)
       VALUES ($1, $2, $3, 'ISSUED')
       RETURNING coupon_code`,
      [user_id, promotion_id, couponCode],
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: '쿠폰이 발급되었습니다.',
      data: {
        coupon_code: inserted.rows[0].coupon_code,
        remaining_quantity: Number(decrement.rows[0].remaining_quantity),
      },
    });
  } catch (err: unknown) {
    await client.query('ROLLBACK');
    const code = typeof err === 'object' && err && 'code' in err ? (err as { code?: string }).code : undefined;
    if (code === '23505') {
      return res.status(409).json({ success: false, message: '쿠폰 코드가 중복되었습니다. 다시 시도해주세요.' });
    }
    console.error('[issueCoupon] Error:', err);
    return res.status(500).json({ success: false, message: '쿠폰 발급 중 서버 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
};

/** GET /api/coupons?user_id= — 내 쿠폰함 */
export const listMyCoupons = async (req: Request, res: Response) => {
  const userId = typeof req.query.user_id === 'string' ? req.query.user_id : '';
  if (!userId) {
    return res.status(400).json({ success: false, message: 'user_id가 필요합니다.' });
  }

  try {
    const result = await pool.query(
      `SELECT
         uc.id, uc.coupon_code, uc.status, uc.issued_at,
         dp.id AS promotion_id, dp.title, dp.total_discount_rate,
         dp.funding_type, dp.coupon_type, dp.end_time,
         m.business_name, f.title AS festival_title,
         mu.metro_region AS metro, mu.name AS municipality_name
       FROM user_coupons uc
       JOIN discount_promotions dp ON dp.id = uc.promotion_id
       JOIN merchants m ON m.id = dp.merchant_id
       LEFT JOIN festivals f ON f.id = dp.festival_id
       LEFT JOIN municipalities mu ON mu.id = m.municipality_id
       WHERE uc.user_id = $1
       ORDER BY uc.issued_at DESC`,
      [userId],
    );
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[listMyCoupons] Error:', err);
    return res.status(500).json({ success: false, message: '쿠폰함을 불러오지 못했습니다.' });
  }
};

export const redeemCoupon = async (req: Request, res: Response) => {
  const { coupon_code, original_amount } = req.body;

  if (!coupon_code || !original_amount || original_amount <= 0) {
    return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. 쿠폰 + 프로모션 + 소상공인 + 지자체 정보를 JOIN 조회하고 쿠폰 행에 잠금(FOR UPDATE)
    const couponResult = await client.query(
      `SELECT
         uc.id AS coupon_id, uc.status,
         dp.merchant_discount_rate, dp.gov_matching_rate,
         dp.max_discount_amount, dp.status AS promotion_status, dp.end_time,
         m.id AS merchant_id, m.municipality_id
       FROM user_coupons uc
       JOIN discount_promotions dp ON dp.id = uc.promotion_id
       JOIN merchants m ON m.id = dp.merchant_id
       WHERE uc.coupon_code = $1
       FOR UPDATE OF uc`,
      [coupon_code]
    );

    if (couponResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: '유효하지 않은 쿠폰 코드입니다.' });
    }

    const c = couponResult.rows[0];

    // 2. 쿠폰 상태 검증 (이중 사용 방지)
    if (c.status !== 'ISSUED') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: `이미 처리된 쿠폰입니다. (현재 상태: ${c.status})` });
    }
    if (c.promotion_status !== 'ACTIVE' || new Date(c.end_time) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(410).json({ success: false, message: '만료되었거나 종료된 프로모션의 쿠폰입니다.' });
    }

    // 3. 할인 금액 산정 (점주 부담 / 지자체 지원분 분리 계산)
    const merchantRate = Number(c.merchant_discount_rate);
    const govRate = Number(c.gov_matching_rate);
    const cap = c.max_discount_amount != null ? Number(c.max_discount_amount) : null;

    let merchantDiscountAmount = Math.round(original_amount * (merchantRate / 100));
    let govSupportAmount = Math.round(original_amount * (govRate / 100));

    // 최대 할인 한도액을 초과하면 두 할인액을 비율대로 축소(Proportional Scaling)
    if (cap != null) {
      const totalDiscount = merchantDiscountAmount + govSupportAmount;
      if (totalDiscount > cap) {
        const scale = cap / totalDiscount;
        merchantDiscountAmount = Math.round(merchantDiscountAmount * scale);
        govSupportAmount = Math.round(govSupportAmount * scale);
      }
    }

    // 4. 지자체 예산 행 잠금 + 실시간 잔액 재검증 (핵심 동시성/보안 가드)
    //    프로모션 등록 시점에는 예산이 있었더라도, 다수의 동시 결제로 예산이 이미 소진되었을 수 있음
    const municipalityLock = await client.query(
      `SELECT budget_balance FROM municipalities WHERE id = $1 FOR UPDATE`,
      [c.municipality_id]
    );
    const currentBudget = Number(municipalityLock.rows[0].budget_balance);

    if (currentBudget < govSupportAmount) {
      // 예산 소진 상태 → 지자체 지원분을 가용 잔액까지만 축소 (점주 할인은 그대로 유지)
      govSupportAmount = Math.max(currentBudget, 0);
    }

    const finalPaidAmount = original_amount - merchantDiscountAmount - govSupportAmount;

    // 5. 원자적 조건부 UPDATE로 예산 차감 (Lost Update 방지 이중 방어)
    const budgetUpdate = await client.query(
      `UPDATE municipalities
       SET budget_balance = budget_balance - $1
       WHERE id = $2 AND budget_balance >= $1
       RETURNING budget_balance`,
      [govSupportAmount, c.municipality_id]
    );

    if (budgetUpdate.rowCount === 0 && govSupportAmount > 0) {
      // 매우 드문 경쟁 상태: FOR UPDATE 검증 이후 예산이 재차 소진된 경우 → 지원금 0으로 재조정
      govSupportAmount = 0;
    }

    // 6. 쿠폰 상태 갱신 (ISSUED → USED)
    await client.query(
      `UPDATE user_coupons SET status = 'USED', used_at = now() WHERE id = $1`,
      [c.coupon_id]
    );

    // 7. 정산 트랜잭션 기록 (PENDING) — 지자체 지원금 자동 정산 원장
    const settlement = await client.query(
      `INSERT INTO settlement_transactions
        (user_coupon_id, merchant_id, municipality_id, original_amount,
         merchant_discount_amount, gov_support_amount, final_paid_amount, settlement_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
       RETURNING *`,
      [c.coupon_id, c.merchant_id, c.municipality_id, original_amount,
       merchantDiscountAmount, govSupportAmount, finalPaidAmount]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: '쿠폰이 정상적으로 사용 처리되었습니다.',
      data: settlement.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[redeemCoupon] Error:', err);
    return res.status(500).json({ success: false, message: '쿠폰 사용 처리 중 서버 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
};
