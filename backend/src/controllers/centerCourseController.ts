import { Request, Response } from 'express';
import {
  approveCenterCourse,
  centerCourseToFestivalCourse,
  findCenterCourseForPlace,
  hydrateCenterCourses,
  listCenterCourses,
  reviewCenterCourse,
  upsertCenterCourse,
  type CenterCourseStatus,
  type CenterLocalCourse,
} from '../constants/centerCourses';
import {
  courseAuth,
  hasCoursePassword,
  resetCoursePassword,
} from '../constants/centerCourseAuth';
import { tryQuery } from '../db/pool';

function parseStatus(value: unknown): CenterCourseStatus {
  if (value === 'approved' || value === 'revision' || value === 'rejected' || value === 'pending') return value;
  return 'pending';
}

function parseStop(value: unknown) {
  const stop = (value || {}) as { name?: string; description?: string; latitude?: number; longitude?: number };
  return {
    name: String(stop.name || ''),
    description: String(stop.description || ''),
    latitude: Number.isFinite(Number(stop.latitude)) ? Number(stop.latitude) : undefined,
    longitude: Number.isFinite(Number(stop.longitude)) ? Number(stop.longitude) : undefined,
  };
}

function fromRow(row: Record<string, unknown>): CenterLocalCourse {
  return {
    id: String(row.id),
    regionId: String(row.region_id),
    metro: row.metro ? String(row.metro) : undefined,
    centerId: String(row.center_id),
    title: String(row.title),
    description: String(row.description || ''),
    images: Array.isArray(row.images) ? row.images.map((item) => String(item)) : [],
    historyCourse: parseStop(row.history_course),
    marketFoodCourse: parseStop(row.market_food_course),
    mainAxis: parseStop(row.main_axis),
    campingAccommodation: parseStop(row.camping_accommodation),
    status: parseStatus(row.status),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

async function loadFromDb(regionId?: string, metro?: string, review?: boolean) {
  const result = await tryQuery(
    `SELECT * FROM center_local_courses
     WHERE ($1 = '' OR region_id ILIKE '%' || $1 || '%' OR $1 ILIKE '%' || region_id || '%')
       AND ($2 = '' OR metro = $2)
       AND ($3 = true OR status = 'approved')
     ORDER BY updated_at DESC`,
    [regionId || '', metro || '', Boolean(review)],
  );
  if (!result?.rows?.length) return null;
  const rows = result.rows.map(fromRow);
  hydrateCenterCourses(rows);
  return rows;
}

export async function listCenterCoursesApi(req: Request, res: Response) {
  const regionId = String(req.query.regionId || req.query.region || req.query.city || '');
  const metro = String(req.query.metro || '');
  const review = req.query.review === '1' || req.query.review === 'true';
  const db = await loadFromDb(regionId || undefined, metro || undefined, review);
  if (db) return res.json({ success: true, data: db });
  return res.json({
    success: true,
    data: listCenterCourses(regionId || undefined, metro || undefined, review ? 'all' : 'approved'),
  });
}

export async function upsertCenterCourseApi(req: Request, res: Response) {
  const body = req.body || {};
  const result = upsertCenterCourse({
    id: typeof body.id === 'string' ? body.id : undefined,
    regionId: String(body.regionId || ''),
    metro: typeof body.metro === 'string' ? body.metro : undefined,
    centerId: String(body.centerId || ''),
    title: String(body.title || ''),
    description: String(body.description || ''),
    images: Array.isArray(body.images) ? body.images.map((item: unknown) => String(item)) : [],
    historyCourse: parseStop(body.historyCourse),
    marketFoodCourse: parseStop(body.marketFoodCourse),
    mainAxis: parseStop(body.mainAxis),
    campingAccommodation: parseStop(body.campingAccommodation),
  });
  if (!result.ok) return res.status(400).json({ success: false, message: result.message });
  const saved = result.data;
  await tryQuery(
    `INSERT INTO center_local_courses (
       id, region_id, metro, center_id, title, description, images,
       history_course, market_food_course, main_axis, camping_accommodation, status, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,NOW())
     ON CONFLICT (id) DO UPDATE SET
       region_id = EXCLUDED.region_id,
       metro = EXCLUDED.metro,
       center_id = EXCLUDED.center_id,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       images = EXCLUDED.images,
       history_course = EXCLUDED.history_course,
       market_food_course = EXCLUDED.market_food_course,
       main_axis = EXCLUDED.main_axis,
       camping_accommodation = EXCLUDED.camping_accommodation,
       status = EXCLUDED.status,
       updated_at = NOW()`,
    [
      saved.id,
      saved.regionId,
      saved.metro || null,
      saved.centerId,
      saved.title,
      saved.description,
      JSON.stringify(saved.images),
      JSON.stringify(saved.historyCourse),
      JSON.stringify(saved.marketFoodCourse),
      JSON.stringify(saved.mainAxis),
      JSON.stringify(saved.campingAccommodation),
      saved.status,
    ],
  );
  return res.json({
    success: true,
    data: saved,
    course: centerCourseToFestivalCourse(saved),
    message: '추천 코스 검토 요청이 접수되었습니다.',
  });
}

export async function reviewCenterCourseApi(req: Request, res: Response) {
  const id = String(req.params.id || req.body?.id || '');
  const status = parseStatus(req.body?.status);
  const result = reviewCenterCourse(id, status);
  if (!result.ok) return res.status(404).json({ success: false, message: result.message });
  await tryQuery(`UPDATE center_local_courses SET status = $2, updated_at = NOW() WHERE id = $1`, [id, status]);
  return res.json({
    success: true,
    data: result.data,
    course: centerCourseToFestivalCourse(result.data),
    message: '코스 검토 상태를 저장했습니다.',
  });
}

export async function approveCenterCourseApi(req: Request, res: Response) {
  const id = String(req.params.id || req.body?.id || '');
  const result = approveCenterCourse(id);
  if (!result.ok) return res.status(404).json({ success: false, message: result.message });
  await tryQuery(`UPDATE center_local_courses SET status = 'approved', updated_at = NOW() WHERE id = $1`, [id]);
  return res.json({
    success: true,
    data: result.data,
    course: centerCourseToFestivalCourse(result.data),
    message: '승인되어 앱에 등재되었습니다.',
  });
}

export async function courseAuthStatusApi(req: Request, res: Response) {
  const centerId = String(req.query.centerId || req.body?.centerId || '');
  return res.json({ success: true, hasPassword: hasCoursePassword(centerId) });
}

export async function courseAuthApi(req: Request, res: Response) {
  const result = courseAuth(req.body || {});
  return res.status(result.ok ? 200 : 400).json({
    success: result.ok,
    hasPassword: result.ok ? result.hasPassword : hasCoursePassword(String(req.body?.centerId || '')),
    message: result.ok ? '확인되었습니다.' : result.message,
  });
}

export async function resetCourseAuthApi(req: Request, res: Response) {
  const centerId = String(req.body?.centerId || req.query.centerId || '');
  const result = resetCoursePassword(centerId);
  if (result.ok) {
    await tryQuery(`DELETE FROM center_course_passwords WHERE center_id = $1`, [centerId]);
  }
  return res.status(result.ok ? 200 : 400).json({
    success: result.ok,
    hasPassword: false,
    message: result.ok ? '해당 지역 코스 비밀번호를 초기화했습니다.' : result.message,
  });
}

export function matchCenterCourse(input: { city?: string; address?: string; title?: string; metro?: string }) {
  return findCenterCourseForPlace(input);
}
