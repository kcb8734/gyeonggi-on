import { Router } from 'express';
import { getDetail, listFestivals, listNearby } from '../controllers/tourController';

const router = Router();

router.get('/festivals', listFestivals);
router.get('/nearby', listNearby);
router.get('/detail/:contentId', getDetail);

export default router;
