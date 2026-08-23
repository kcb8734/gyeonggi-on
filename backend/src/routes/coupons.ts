import { Router } from 'express';
import { issueCoupon, listMyCoupons, redeemCoupon } from '../controllers/couponController';
import { useCoupon, verifyCoupon } from '../controllers/couponScanController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
// 메인 지도 화면이 Authorization 헤더 없이 호출하는 현재 계약에 맞춤.
// TODO(보안): 고객 로그인 연동 후 authMiddleware 추가
router.get('/', listMyCoupons);
router.post('/issue', issueCoupon);
router.post('/redeem', authMiddleware, redeemCoupon);
router.post('/verify', verifyCoupon);
router.post('/use', useCoupon);
export default router;
