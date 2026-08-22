import { Router } from 'express';
import { getMerchantSettlement, verifyMerchant } from '../controllers/merchantController';

const router = Router();
router.post('/verify', verifyMerchant);
router.get('/:id/settlement', getMerchantSettlement);
export default router;
