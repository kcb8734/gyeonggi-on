import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { syncOpenCultureEvents } from '../services/cultureOpenSync';
import { AREA_CODE_BY_METRO, REGION_LABEL } from '../constants/metroLocalities';
import { collectGyeonggiFestivals, collectRegionFestivals, syncNationwideFestivals, tourItemsToHome, upsertTourFestivals } from '../services/festivalSyncService';
import { toNumber } from '../utils/geo';

function cronAuthorized(req: Request): boolean {
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret) return true;
  const header = String(req.headers.authorization || '');
  return header === `Bearer ${secret}`;
}

export function toListedFestival(row: Record<string, unknown>) {
  const contentId = String(row.tour_content_id || row.id || '');
  return {
    id: row.tour_content_id ? `tour-${row.tour_content_id}` : row.id,
    contentId,
    contentTypeId: '15',
    title: row.title,
    location_name: row.location_name,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    start_date: row.start_date,
    end_date: row.end_date,
    municipality_name: row.municipality_name ?? null,
    description: row.description ?? null,
    category: row.category ?? '문화/예술',
    image_url: row.image_url ?? null,
    is_trending: Boolean(row.is_trending),
    source: row.source ?? 'db',
    tel: row.tel ?? null,
  };
}

/** GET /api/festivals — 경기온 홈 카드용 최신 축제 목록 */
export const listSyncedFestivals = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
         f.id, f.title, f.location_name, f.latitude, f.longitude,
         f.start_date, f.end_date, f.description, f.category, f.image_url, f.is_trending,
         f.tour_content_id, f.tel, f.source,
         mu.name AS municipality_name
       FROM festivals f
       LEFT JOIN municipalities mu ON mu.id = f.municipality_id
       ORDER BY f.is_trending DESC, f.start_date ASC
       LIMIT 80`,
    );
    if (result.rowCount) {
      return res.json({
        success: true,
        metro: 'GYEONGGI',
        count: result.rowCount,
        festivals: result.rows.map(toListedFestival),
        data: result.rows.map(toListedFestival),
      });
    }
  } catch (err) {
    console.warn('[listSyncedFestivals] DB 목록 실패, TourAPI 실시간 조회로 대체:', err);
  }

  try {
    const collected = await collectGyeonggiFestivals();
    const festivals = tourItemsToHome(collected.items);
    return res.json({
      success: true,
      metro: 'GYEONGGI',
      count: festivals.length,
      source: collected.source,
      festivals,
      data: festivals,
    });
  } catch (err) {
    console.error('[listSyncedFestivals] Error:', err);
    return res.status(500).json({ success: false, message: '축제 목록을 불러오지 못했습니다.' });
  }
};

/** GET|POST /api/festivals/sync 및 Vercel Cron /api/cron/festivals */
export const runFestivalSync = async (req: Request, res: Response) => {
  if (!cronAuthorized(req)) {
    return res.status(401).json({ success: false, message: 'cron 인증이 필요합니다.' });
  }
  if (/cron/i.test(String(req.path || req.originalUrl || ''))) {
    const result = await syncNationwideFestivals();
    return res.status(result.success ? 200 : 502).json(result);
  }
  const hint = String(req.query.source || req.query.api || '').toLowerCase();
  const metro = String(req.query.metro || '').toUpperCase();
  if (hint === 'tour' || hint === 'tourapi' || hint === 'searchfestival2') {
    const nationwide = !metro || metro === 'ALL' || String(req.query.areaCode || '') === 'all';
    if (nationwide) {
      const result = await syncNationwideFestivals();
      return res.status(result.success ? 200 : 502).json({
        ...result,
        sourceLabel: '한국관광공사 TourAPI 4.0 전국',
        targetApi: 'searchFestival2',
      });
    }
    const areaCode = AREA_CODE_BY_METRO[metro] || String(req.query.areaCode || '31');
    const collected = await collectRegionFestivals(areaCode);
    const persist = await upsertTourFestivals(collected.items);
    return res.status(200).json({
      success: true,
      source: 'tour',
      sourceLabel: `한국관광공사 TourAPI 4.0 ${REGION_LABEL[metro] || metro}`,
      targetApi: `searchFestival2:${metro}`,
      fetched: collected.items.length,
      upserted: persist.upserted,
      skipped: persist.skipped,
      persisted: true,
      failed: 0,
      categories: [],
      message: `${REGION_LABEL[metro] || metro} TourAPI ${persist.upserted}건을 DB에 동기화했습니다.`,
    });
  }
  if (hint === 'muni' || hint === 'municipal' || hint === 'local') {
    if (metro === 'SEOUL' || metro === 'GYEONGGI') {
      const result = await syncOpenCultureEvents({ source: metro === 'SEOUL' ? 'seoul' : 'ggc' });
      return res.status(200).json(result);
    }
    const urlEnv = `${metro}_CULTURE_API_URL`;
    const keyEnv = `${metro}_CULTURE_API_KEY`;
    const ready = Boolean(String(process.env[urlEnv] || '').trim() && String(process.env[keyEnv] || '').trim());
    if (!ready) {
      return res.status(200).json({
        success: false,
        source: 'muni',
        sourceLabel: `${REGION_LABEL[metro] || metro} 지자체 OpenAPI`,
        targetApi: `${metro}_CULTURE`,
        fetched: 0,
        upserted: 0,
        ready: false,
        message: `${urlEnv} 와 ${keyEnv} 를 설정하면 해당 광역 공공API 수집이 켜집니다.`,
      });
    }
  }
  const result = await syncOpenCultureEvents({
    source: String(req.query.source || req.query.api || ''),
  });
  return res.status(200).json(result);
};
