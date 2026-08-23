import { Router } from 'express';
import { recommendCourse } from '../controllers/courseController';

const router = Router();
router.get('/recommend', recommendCourse);
router.post('/recommend', recommendCourse);
export default router;
