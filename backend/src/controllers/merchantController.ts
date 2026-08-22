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
        `UPDATE merchants SET is_verified = $2 WHERE id = $1`,
        [merchantId, verified],
      );
    } else {
      await pool.query(
        `UPDATE merchants SET is_verified = $2 WHERE regexp_replace(business_number, '[^0-9]', '', 'g') = $1`,
        [normalizeBusinessNumber(businessNumber), verified],
      );
    }

    return res.status(verified ? 200 : 409).json({
      success: verified,
      message: verified
        ? '국세청 계속사업자로 확인되었습니다.'
        : rejectionMessage(status),
      data: {
        verified,
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
