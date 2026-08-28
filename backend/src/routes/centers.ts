import { Router } from 'express';
import {
  applyCenter,
  applyCenterCard,
  listCenterApplications,
  listCenterRegionDetail,
  listCenterRegions,
  reviewCenterApplication,
} from '../controllers/centerController';
import { listCenterCoursesApi, upsertCenterCourseApi, approveCenterCourseApi, courseAuthApi, courseAuthStatusApi, resetCourseAuthApi } from '../controllers/centerCourseController';

const router = Router();
router.get('/', listCenterRegions);
router.get('/applications', listCenterApplications);
router.post('/apply', applyCenter);
router.patch('/applications/:id', reviewCenterApplication);
router.post('/applications/:id/card', applyCenterCard);
router.get('/course-auth', courseAuthStatusApi);
router.post('/course-auth', courseAuthApi);
router.post('/course-auth/reset', resetCourseAuthApi);
router.get('/courses', listCenterCoursesApi);
router.post('/courses', upsertCenterCourseApi);
router.post('/courses/:id/approve', approveCenterCourseApi);
router.get('/:region', listCenterRegionDetail);
export default router;
