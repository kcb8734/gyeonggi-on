import { Request, Response } from 'express';
import { getSettlementPreview, sendOfficialSettlement } from '../services/settlementOfficialService';
import { errorMessage, errorStatus } from '../utils/errors';

export async function previewOfficialSettlement(req: Request, res: Response) {
  try {
    const merchantId = typeof req.query.merchant_id === 'string' ? req.query.merchant_id : undefined;
    const data = await getSettlementPreview(merchantId);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(errorStatus(err)).json({ success: false, message: errorMessage(err) });
  }
}

export async function sendOfficialSettlementMail(req: Request, res: Response) {
  try {
    const merchantId = typeof req.body?.merchant_id === 'string' ? req.body.merchant_id : undefined;
    const toEmail = typeof req.body?.to_email === 'string' ? req.body.to_email : undefined;
    const data = await sendOfficialSettlement({ merchantId, toEmail });
    return res.json({ success: true, data, message: data.message });
  } catch (err) {
    return res.status(errorStatus(err)).json({ success: false, message: errorMessage(err) });
  }
}
