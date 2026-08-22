import { Router } from 'express';
import { createPromotion } from '../controllers/promotionController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.post('/', authMiddleware, createPromotion);
export default router;
