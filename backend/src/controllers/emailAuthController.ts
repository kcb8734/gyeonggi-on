import { Request, Response } from 'express';
import { confirmManagerEmailCode, sendManagerEmailCode } from '../services/emailAuthService';

export const sendEmailCode = async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const result = await sendManagerEmailCode(email);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    ...(result.devCode ? { devCode: result.devCode } : {}),
    ...(result.challenge ? { challenge: result.challenge } : {}),
  });
};

export const verifyEmailCodeHandler = async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const challenge = typeof req.body?.challenge === 'string' ? req.body.challenge : '';
  const result = confirmManagerEmailCode(email, code, challenge);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
  });
};
