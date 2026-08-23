import { Router } from 'express';
import { previewOfficialSettlement, sendOfficialSettlementMail } from '../controllers/settlementOfficialController';

const router = Router();
router.get('/preview', previewOfficialSettlement);
router.post('/send', sendOfficialSettlementMail);
export default router;
