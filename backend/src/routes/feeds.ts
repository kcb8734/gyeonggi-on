import { Router } from 'express';
import { createFeed, getFeedRewards } from '../controllers/feedController';

const router = Router();

router.post('/', createFeed);
router.get('/rewards/:userId', getFeedRewards);

export default router;
