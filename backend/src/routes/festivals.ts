import { Router } from 'express';
import { postFestivalAiSummary } from '../controllers/festivalAiController';
import { getFestivalMap, getNearbyFestivals } from '../controllers/festivalController';
import { listSyncedFestivals, runFestivalSync } from '../controllers/festivalListController';

const router = Router();

router.get('/', listSyncedFestivals);
router.get('/sync', runFestivalSync);
router.post('/sync', runFestivalSync);
router.post('/ai-summary', postFestivalAiSummary);
router.get('/nearby', getNearbyFestivals);
router.get('/:id/map', getFestivalMap);

export default router;
