import { Request, Response } from 'express';
import { pool } from '../db/pool';

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
