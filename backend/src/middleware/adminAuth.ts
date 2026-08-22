import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from './auth';

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  return authMiddleware(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    return next();
  });
};
