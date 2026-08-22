import { Router } from 'express';
import { verifyMerchant } from '../controllers/merchantController';

const router = Router();
router.post('/verify', verifyMerchant);
export default router;
