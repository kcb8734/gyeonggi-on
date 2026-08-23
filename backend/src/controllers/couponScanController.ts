import { Request, Response } from 'express';
import { useCouponCode, verifyCouponCode } from '../services/couponScanService';
import { errorMessage, errorStatus } from '../utils/errors';

export async function verifyCoupon(req: Request, res: Response) {
  try {
    const code = String(req.body?.code ?? req.body?.coupon_code ?? '').trim();
    if (!code) return res.status(400).json({ success: false, message: 'QR code 값이 필요합니다.' });
    const data = await verifyCouponCode(code);
    return res.json({ success: true, data, message: '사용 가능한 쿠폰입니다.' });
  } catch (err) {
    return res.status(errorStatus(err)).json({ success: false, message: errorMessage(err) });
  }
}

export async function useCoupon(req: Request, res: Response) {
  try {
    const code = String(req.body?.code ?? req.body?.coupon_code ?? '').trim();
    const merchantId = typeof req.body?.merchant_id === 'string' ? req.body.merchant_id : undefined;
    if (!code) return res.status(400).json({ success: false, message: 'QR code 값이 필요합니다.' });
    const data = await useCouponCode(code, merchantId);
    return res.json({ success: true, data, message: '쿠폰이 사용 처리되었습니다.' });
  } catch (err) {
    return res.status(errorStatus(err)).json({ success: false, message: errorMessage(err) });
  }
}
