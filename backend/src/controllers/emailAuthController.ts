import { Request, Response } from 'express';
import { confirmManagerEmailCode, sendManagerEmailCode } from '../services/emailAuthService';

export const sendEmailCode = async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const result = await sendManagerEmailCode(email);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
};

export const verifyEmailCodeHandler = async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  const result = confirmManagerEmailCode(email, code);
  return res.status(result.status).json({
    success: result.success,
    message: result.message,
  });
};
