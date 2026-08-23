import { Router } from 'express';
import { getFestivalMap, getNearbyFestivals } from '../controllers/festivalController';
import { listSyncedFestivals, runFestivalSync } from '../controllers/festivalListController';

const router = Router();

router.get('/', listSyncedFestivals);
router.get('/sync', runFestivalSync);
router.post('/sync', runFestivalSync);
router.get('/nearby', getNearbyFestivals);
router.get('/:id/map', getFestivalMap);

export default router;
