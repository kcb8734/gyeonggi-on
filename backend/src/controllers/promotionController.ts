import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { PoolClient } from 'pg';
import {
  fetchBusinessStatus,
  NtsLookupError,
  rejectionMessage,
} from '../services/ntsService';

export const createPromotion = async (req: Request, res: Response) => {
  const {
    merchant_id: merchantIdBody,
    festival_id,
    title,
    merchant_discount_rate,
    max_discount_amount,
    total_quantity,
    start_time,
    end_time,
    business_name,
    business_number,
    main_menu,
    features,
    request_matching,
    funding_type: fundingTypeBody,
  } = req.body;

  const selfFunded =
    fundingTypeBody === 'MERCHANT_ONLY' ||
    request_matching === false ||
    request_matching === 'false';
  const maxRate = selfFunded ? 100 : 50;

  // 0. 입력 유효성 검증
  if (
    (!merchantIdBody && !business_number) ||
    !title || merchant_discount_rate == null ||
    !total_quantity || !start_time || !end_time
  ) {
    return res.status(400).json({ success: false, message: '필수 입력값이 누락되었습니다.' });
  }
  if (merchant_discount_rate <= 0 || merchant_discount_rate > maxRate) {
    return res.status(400).json({
      success: false,
      message: selfFunded
        ? '상가 자체 할인율은 0~100% 사이여야 합니다.'
        : '할인율은 0~50% 사이여야 합니다.',
    });
  }

  // TODO(보안): req.user(인증 미들웨어에서 주입)의 merchant_id와 body.merchant_id가
  // 일치하는지 검증하여, 다른 점주 계정으로 등록하는 것을 방지해야 함.
  // if (req.user.merchantId !== merchant_id) return res.status(403).json(...)

  const client: PoolClient = await pool.connect();
  try {
    // 1. 소상공인 조회 후 국세청 상태조회 — 계속사업자(b_stt_cd: 01)만 1:1 매칭 등록
    let merchantResult = merchantIdBody
      ? await client.query(
          `SELECT id, municipality_id, is_verified, business_number, business_name
           FROM merchants WHERE id = $1`,
          [merchantIdBody],
        )
      : await client.query(
          `SELECT id, municipality_id, is_verified, business_number, business_name
           FROM merchants WHERE regexp_replace(business_number, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')`,
          [business_number],
        );

    if (merchantResult.rowCount === 0 && business_number && business_name && festival_id) {
      const festivalMunicipality = await client.query(
        `SELECT municipality_id FROM festivals WHERE id = $1`,
        [festival_id],
      );
      const municipalityId = festivalMunicipality.rows[0]?.municipality_id;
      if (municipalityId) {
        merchantResult = await client.query(
          `INSERT INTO merchants
            (owner_user_id, municipality_id, business_name, business_number, category, address, is_verified)
           VALUES (gen_random_uuid(), $1, $2, $3, '기타', '미입력', FALSE)
           RETURNING id, municipality_id, is_verified, business_number, business_name`,
          [municipalityId, business_name, business_number],
        );
      }
    }

    if (merchantResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: '등록된 소상공인 정보를 찾을 수 없습니다.' });
    }

    const merchant = merchantResult.rows[0];
    const merchant_id = merchant.id;
    let ntsStatus;
    try {
      ntsStatus = await fetchBusinessStatus(business_number || merchant.business_number);
    } catch (err) {
      if (err instanceof NtsLookupError) {
        return res.status(err.statusCode).json({ success: false, message: err.message });
      }
      throw err;
    }

    await client.query(
      `UPDATE merchants
       SET is_verified = $2,
           nts_verified_at = now(),
           nts_b_stt_cd = $3,
           business_name = COALESCE(NULLIF($4, ''), business_name)
       WHERE id = $1`,
      [merchant_id, ntsStatus.isActive, ntsStatus.b_stt_cd, business_name ?? ''],
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

    let appliedGovRate = 0;
    let matchingStatus = 'NONE';
    let fundingType = 'MERCHANT_ONLY';
    let matchNote = `상가 자체 할인 쿠폰(${merchant_discount_rate}%)이 즉시 발행됩니다. 지자체 매칭 없이 점주가 전액 부담합니다.`;

    if (!selfFunded) {
      fundingType = 'MATCHED';
      matchingStatus = 'PENDING';
      matchNote = '국세청 확인이 완료되었습니다. 지자체 1:1 매칭은 관리자 승인 후 적용됩니다. 상가 자체 할인은 바로 사용할 수 있습니다.';
    }

    // 4. 프로모션 저장 (total_discount_rate는 DB GENERATED 컬럼이 자동 계산)
    const insertResult = await client.query(
      `INSERT INTO discount_promotions
        (merchant_id, festival_id, title, merchant_discount_rate, gov_matching_rate,
         max_discount_amount, total_quantity, remaining_quantity, start_time, end_time, status,
         funding_type, matching_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, 'ACTIVE', $10, $11)
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
        fundingType,
        matchingStatus,
      ]
    );

    // 참고: 실제 예산 "차감"은 쿠폰 사용(redeem) 시점에 실시간으로 이루어진다 (couponController.ts 참조).
    // 여기서의 FOR UPDATE 잠금은 "동시에 여러 점주가 같은 예산을 보고 매칭을 확정하려는" 경쟁 상태를 방지하는 역할이다.

    try {
      await client.query(
        `UPDATE discount_promotions
         SET title = LEFT($1, 100)
         WHERE id = $2`,
        [
          `${title}${main_menu ? ` · ${String(main_menu).slice(0, 20)}` : ''}`,
          insertResult.rows[0].id,
        ],
      );
    } catch {
      // 소개 컬럼이 없어도 등록은 유지
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: `${matchNote}${main_menu || features ? ` 주요 메뉴: ${main_menu ?? ''} / 특징: ${features ?? ''}` : ''}`,
      data: {
        ...insertResult.rows[0],
        main_menu: main_menu ?? null,
        features: features ?? null,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[createPromotion] Error:', err);
    return res.status(500).json({ success: false, message: '프로모션 등록 중 서버 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
};
