import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { PoolClient } from 'pg';
import {
  fetchBusinessStatus,
  NtsLookupError,
  rejectionMessage,
} from '../services/ntsService';

// 정책상 지자체 매칭 할인율의 최대 캡(%) — 정책 변경 시 이 값만 수정
const GOV_MATCHING_CAP_RATE = 10.0;

export const createPromotion = async (req: Request, res: Response) => {
  const {
    merchant_id,
    festival_id,
    title,
    merchant_discount_rate,
    max_discount_amount,
    total_quantity,
    start_time,
    end_time,
  } = req.body;

  // 0. 입력 유효성 검증
  if (
    !merchant_id || !title || merchant_discount_rate == null ||
    !total_quantity || !start_time || !end_time
  ) {
    return res.status(400).json({ success: false, message: '필수 입력값이 누락되었습니다.' });
  }
  if (merchant_discount_rate <= 0 || merchant_discount_rate > 50) {
    return res.status(400).json({ success: false, message: '할인율은 0~50% 사이여야 합니다.' });
  }

  // TODO(보안): req.user(인증 미들웨어에서 주입)의 merchant_id와 body.merchant_id가
  // 일치하는지 검증하여, 다른 점주 계정으로 등록하는 것을 방지해야 함.
  // if (req.user.merchantId !== merchant_id) return res.status(403).json(...)

  const client: PoolClient = await pool.connect();
  try {
    // 1. 소상공인 조회 후 국세청 상태조회 — 계속사업자(b_stt_cd: 01)만 1:1 매칭 등록
    const merchantResult = await client.query(
      `SELECT id, municipality_id, is_verified, business_number, business_name
       FROM merchants WHERE id = $1`,
      [merchant_id]
    );

    if (merchantResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: '등록된 소상공인 정보를 찾을 수 없습니다.' });
    }

    const merchant = merchantResult.rows[0];
    let ntsStatus;
    try {
      ntsStatus = await fetchBusinessStatus(merchant.business_number);
    } catch (err) {
      if (err instanceof NtsLookupError) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      throw err;
    }

    await client.query(
      `UPDATE merchants SET is_verified = $2 WHERE id = $1`,
      [merchant_id, ntsStatus.isActive],
    );

    if (!ntsStatus.isActive) {
      return res.status(403).json({
        success: false,
        message: rejectionMessage(ntsStatus),
        data: {
          b_stt: ntsStatus.b_stt,
          b_stt_cd: ntsStatus.b_stt_cd,
          tax_type: ntsStatus.tax_type,
        },
      });
    }

    await client.query('BEGIN');

    // 2. 지자체 예산 행에 배타적 잠금(FOR UPDATE) — 동시 등록 요청 간 경쟁 상태(Race Condition) 직렬화
    const municipalityResult = await client.query(
      `SELECT id, budget_balance FROM municipalities WHERE id = $1 FOR UPDATE`,
      [merchant.municipality_id]
    );

    if (municipalityResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: '소속 지자체 정보를 찾을 수 없습니다.' });
    }

    const budgetBalance = Number(municipalityResult.rows[0].budget_balance);

    // 3. 예상 지자체 지원 최대 노출액(Worst-case Exposure) 산정
    //    정책: 점주 할인율만큼 1:1 매칭 (정책 캡 이내)
    //    "전체 발급분이 모두 사용되고 매 건 max_discount_amount까지 소진"되는 최악의 시나리오 기준으로 필요 예산을 계산
    const requestedGovRate = Math.min(merchant_discount_rate, GOV_MATCHING_CAP_RATE);
    const totalRateIfMatched = merchant_discount_rate + requestedGovRate;
    const govShareRatio = requestedGovRate / totalRateIfMatched; // 총 할인액 중 지자체 부담 비율
    const perCouponCap = max_discount_amount ?? 0;
    const estimatedGovExposure = perCouponCap * govShareRatio * total_quantity;

    let appliedGovRate = 0;
    let matchNote = '지자체 예산 부족으로 매칭 할인이 적용되지 않았습니다.';

    if (budgetBalance <= 0) {
      appliedGovRate = 0;
    } else if (estimatedGovExposure <= budgetBalance) {
      // 예산 충분 → 100% 매칭
      appliedGovRate = requestedGovRate;
      matchNote = `지자체 1:1 매칭 할인(${appliedGovRate}%)이 적용되었습니다.`;
    } else {
      // 예산 부족 → 가용 예산 내에서 매칭 가능한 비율로 축소(부분 매칭)
      const affordableRatio = budgetBalance / estimatedGovExposure;
      appliedGovRate = Math.floor(requestedGovRate * affordableRatio * 100) / 100;
      matchNote = `지자체 예산 부족으로 매칭 할인율이 ${requestedGovRate}%에서 ${appliedGovRate}%로 축소 적용되었습니다.`;
    }

    // 4. 프로모션 저장 (total_discount_rate는 DB GENERATED 컬럼이 자동 계산)
    const insertResult = await client.query(
      `INSERT INTO discount_promotions
        (merchant_id, festival_id, title, merchant_discount_rate, gov_matching_rate,
         max_discount_amount, total_quantity, remaining_quantity, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, 'ACTIVE')
       RETURNING *`,
      [
        merchant_id,
        festival_id ?? null,
        title,
        merchant_discount_rate,
        appliedGovRate,
        max_discount_amount ?? null,
        total_quantity,
        start_time,
        end_time,
      ]
    );

    // 참고: 실제 예산 "차감"은 쿠폰 사용(redeem) 시점에 실시간으로 이루어진다 (couponController.ts 참조).
    // 여기서의 FOR UPDATE 잠금은 "동시에 여러 점주가 같은 예산을 보고 매칭을 확정하려는" 경쟁 상태를 방지하는 역할이다.

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: matchNote,
      data: insertResult.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[createPromotion] Error:', err);
    return res.status(500).json({ success: false, message: '프로모션 등록 중 서버 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
};
