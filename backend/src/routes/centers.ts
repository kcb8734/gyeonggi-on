import { Router } from 'express';
import { applyCenter, listCenterRegionDetail, listCenterRegions } from '../controllers/centerController';

const router = Router();
router.get('/', listCenterRegions);
router.get('/:region', listCenterRegionDetail);
router.post('/apply', applyCenter);
export default router;
