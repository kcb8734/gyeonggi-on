import { Request, Response } from 'express';
import {
  centerCourseToFestivalCourse,
  findCenterCourseForPlace,
  hydrateCenterCourses,
  listCenterCourses,
  upsertCenterCourse,
  type CenterLocalCourse,
} from '../constants/centerCourses';
import { tryQuery } from '../db/pool';

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
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

async function loadFromDb(regionId?: string, metro?: string) {
  const result = await tryQuery(
    `SELECT * FROM center_local_courses
     WHERE ($1 = '' OR region_id ILIKE '%' || $1 || '%' OR $1 ILIKE '%' || region_id || '%')
       AND ($2 = '' OR metro = $2)
     ORDER BY updated_at DESC`,
    [regionId || '', metro || ''],
  );
  if (!result?.rows?.length) return null;
  const rows = result.rows.map(fromRow);
  hydrateCenterCourses(rows);
  return rows;
}

export async function listCenterCoursesApi(req: Request, res: Response) {
  const regionId = String(req.query.regionId || req.query.region || req.query.city || '');
  const metro = String(req.query.metro || '');
  const db = await loadFromDb(regionId || undefined, metro || undefined);
  return res.json({ success: true, data: db ?? listCenterCourses(regionId || undefined, metro || undefined) });
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
       history_course, market_food_course, main_axis, camping_accommodation, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,NOW())
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
    ],
  );
  return res.json({ success: true, data: saved, course: centerCourseToFestivalCourse(saved) });
}

export function matchCenterCourse(input: { city?: string; address?: string; title?: string; metro?: string }) {
  return findCenterCourseForPlace(input);
}
