import { Router } from 'express';
import { getHomeFeed } from '../controllers/homeController';

const router = Router();
router.get('/', getHomeFeed);
export default router;
