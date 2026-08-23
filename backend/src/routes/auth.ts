import { Router } from 'express';
import { googleLogin, kakaoLogin, refreshSession } from '../controllers/authController';
import { sendEmailCode, verifyEmailCodeHandler } from '../controllers/emailAuthController';

const router = Router();
router.post('/kakao', kakaoLogin);
router.post('/google', googleLogin);
router.post('/refresh', refreshSession);
router.post('/send-email-code', sendEmailCode);
router.post('/verify-email-code', verifyEmailCodeHandler);
export default router;
