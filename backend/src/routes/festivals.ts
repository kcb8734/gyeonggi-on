import { Router } from 'express';
import { getFestivalMap, getNearbyFestivals } from '../controllers/festivalController';

const router = Router();

router.get('/nearby', getNearbyFestivals);
router.get('/:id/map', getFestivalMap);

export default router;
