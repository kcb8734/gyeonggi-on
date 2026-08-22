import { Router } from 'express';
import { redeemCoupon } from '../controllers/couponController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.post('/redeem', authMiddleware, redeemCoupon);
export default router;
