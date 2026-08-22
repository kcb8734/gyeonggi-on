import { Router } from 'express';
import { adminLogin } from '../controllers/adminAuthController';
import {
  approveMerchantMatching,
  getBudgetOverview,
  getCouponStats,
  listVerifiedMerchants,
} from '../controllers/adminController';
import { adminAuthMiddleware } from '../middleware/adminAuth';

const router = Router();

router.post('/login', adminLogin);
router.get('/merchants', adminAuthMiddleware, listVerifiedMerchants);
router.post('/merchants/:id/approve', adminAuthMiddleware, approveMerchantMatching);
router.get('/coupons/stats', adminAuthMiddleware, getCouponStats);
router.get('/budget', adminAuthMiddleware, getBudgetOverview);

export default router;
