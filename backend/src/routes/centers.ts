import { Router } from 'express';
import {
  applyCenter,
  applyCenterCard,
  listCenterApplications,
  listCenterRegionDetail,
  listCenterRegions,
  reviewCenterApplication,
} from '../controllers/centerController';
import { listCenterCoursesApi, upsertCenterCourseApi } from '../controllers/centerCourseController';

const router = Router();
router.get('/', listCenterRegions);
router.get('/applications', listCenterApplications);
router.post('/apply', applyCenter);
router.patch('/applications/:id', reviewCenterApplication);
router.post('/applications/:id/card', applyCenterCard);
router.get('/courses', listCenterCoursesApi);
router.post('/courses', upsertCenterCourseApi);
router.get('/:region', listCenterRegionDetail);
export default router;
