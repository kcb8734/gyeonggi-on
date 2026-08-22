import { Router } from 'express';
import { googleLogin, kakaoLogin, refreshSession } from '../controllers/authController';

const router = Router();
router.post('/kakao', kakaoLogin);
router.post('/google', googleLogin);
router.post('/refresh', refreshSession);
export default router;
