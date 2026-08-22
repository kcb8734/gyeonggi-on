import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  userId: string;
  merchantId?: string;
  role: 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

/**
 * JWT 기반 인증 미들웨어.
 * Authorization: Bearer <token> 헤더를 검증하고 req.user에 사용자 정보를 주입한다.
 * 컨트롤러에서는 req.user.merchantId 등으로 요청자의 소유권을 검증해야 한다 (§2.4 TODO 참고).
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.slice('Bearer '.length);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: '유효하지 않거나 만료된 토큰입니다.' });
  }
};
