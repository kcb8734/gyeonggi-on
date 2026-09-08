import { timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const adminLogin = async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');

  const expectedEmail = process.env.ADMIN_EMAIL || 'kcb8734@gmail.com';
  const expectedPassword = process.env.ADMIN_PASSWORD || 'kimcb8113!';

  if (!email || !password) {
    return res.status(400).json({ success: false, message: '이메일과 비밀번호를 입력해주세요.' });
  }

  if (!safeEqual(email, expectedEmail) || !safeEqual(password, expectedPassword)) {
    return res.status(401).json({ success: false, message: '관리자 계정 정보가 올바르지 않습니다.' });
  }

  const token = jwt.sign(
    { userId: 'admin', role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '12h' },
  );

  return res.json({
    success: true,
    message: '관리자 로그인에 성공했습니다.',
    data: {
      token,
      email: expectedEmail,
      role: 'ADMIN',
    },
  });
};
