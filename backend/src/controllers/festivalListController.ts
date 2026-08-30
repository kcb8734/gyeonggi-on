import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { syncOpenCultureEvents } from '../services/cultureOpenSync';
import { AREA_CODE_BY_METRO, REGION_LABEL, normalizeMetroId } from '../constants/metroLocalities';
import { collectGyeonggiFestivals, collectRegionFestivals, syncNationwideFestivals, tourItemsToHome, upsertTourFestivals } from '../services/festivalSyncService';
import { toNumber } from '../utils/geo';

function cronAuthorized(req: Request): boolean {
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret) return true;
  const header = String(req.headers.authorization || '');
  return header === `Bearer ${secret}`;
}

export function festivalDateYmd(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const text = String(value ?? '').trim();
  if (!text) return '';
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dotted = text.match(/(\d{4})[./](\d{1,2})[./](\d{1,2})/);
  if (dotted) return `${dotted[1]}-${dotted[2].padStart(2, '0')}-${dotted[3].padStart(2, '0')}`;
  const digits = text.replace(/\D/g, '');
  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return '';
}

export function listedMetroForRow(row: Record<string, unknown>, fallback = 'GYEONGGI') {
  const source = String(row.source || '').toLowerCase();
  const hay = `${row.location_name || ''} ${row.municipality_name || ''} ${row.title || ''} ${row.description || ''}`;
  if (source === 'seoul') return 'SEOUL';
  if (source === 'ggc') return 'GYEONGGI';
  if (source === 'ifac' || source === 'incheon') {
    if (hay.includes('서울')) return 'SEOUL';
    if (hay.includes('경기')) return 'GYEONGGI';
    return String(row.metro_region || 'INCHEON');
  }
  if (hay.includes('서울')) return 'SEOUL';
  if (hay.includes('인천')) return 'INCHEON';
  if (hay.includes('경기')) return 'GYEONGGI';
  return String(row.metro_region || row.metro || fallback);
}

export function toListedFestival(row: Record<string, unknown>, fallback = 'GYEONGGI') {
  const contentId = String(row.tour_content_id || row.id || '');
  const start = festivalDateYmd(row.start_date) || festivalDateYmd(row.end_date);
  const end = festivalDateYmd(row.end_date) || start;
  const metro = listedMetroForRow(row, fallback);
  return {
    id: row.tour_content_id ? `tour-${row.tour_content_id}` : row.id,
    contentId,
    contentTypeId: '15',
    title: row.title,
    location_name: row.location_name,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    start_date: start || null,
    end_date: end || null,
    municipality_name: row.municipality_name ?? null,
    description: row.description ?? null,
    category: row.category ?? '문화/예술',
    image_url: row.image_url ?? null,
    is_trending: Boolean(row.is_trending),
    source: row.source ?? 'db',
    tel: row.tel ?? null,
    metro,
    regionalZone: metro,
  };
}

const LIST_SQL_WITH_METRO = `SELECT
         f.id, f.title, f.location_name, f.latitude, f.longitude,
         f.start_date, f.end_date, f.description, f.category, f.image_url, f.is_trending,
         f.tour_content_id, f.tel, f.source,
         mu.name AS municipality_name,
         mu.metro_region
       FROM festivals f
       LEFT JOIN municipalities mu ON mu.id = f.municipality_id
       ORDER BY
         CASE WHEN LOWER(COALESCE(f.source, '')) IN ('seoul', 'ggc', 'ifac', 'incheon') THEN 0 ELSE 1 END,
         f.is_trending DESC,
         f.start_date DESC NULLS LAST
       LIMIT 400`;

const LIST_SQL_BASIC = `SELECT
         f.id, f.title, f.location_name, f.latitude, f.longitude,
         f.start_date, f.end_date, f.description, f.category, f.image_url, f.is_trending,
         f.tour_content_id, f.tel, f.source,
         mu.name AS municipality_name
       FROM festivals f
       LEFT JOIN municipalities mu ON mu.id = f.municipality_id
       ORDER BY
         CASE WHEN LOWER(COALESCE(f.source, '')) IN ('seoul', 'ggc', 'ifac', 'incheon') THEN 0 ELSE 1 END,
         f.is_trending DESC,
         f.start_date DESC NULLS LAST
       LIMIT 400`;

/** GET /api/festivals — 백오피스 수집분(서울·경기·인천 포함)을 홈 카드에 내려준다 */
export const listSyncedFestivals = async (req: Request, res: Response) => {
  const metro = normalizeMetroId(String(req.query.metro || 'GYEONGGI'));
  try {
    let rows: Array<Record<string, unknown>> = [];
    try {
      const result = await pool.query(LIST_SQL_WITH_METRO);
      rows = result.rows as Array<Record<string, unknown>>;
    } catch {
      const result = await pool.query(LIST_SQL_BASIC);
      rows = result.rows as Array<Record<string, unknown>>;
    }
    const festivals = rows
      .map((row) => toListedFestival(row, metro))
      .filter((row) => !metro || metro === 'ALL' || row.metro === metro)
      .slice(0, 200);
    if (festivals.length) {
      return res.json({
        success: true,
        metro,
        count: festivals.length,
        source: 'db',
        festivals,
        data: festivals,
      });
    }
  } catch (err) {
    console.warn('[listSyncedFestivals] DB 목록 실패, TourAPI 실시간 조회로 대체:', err);
  }

  try {
    const areaCode = AREA_CODE_BY_METRO[metro] || '31';
    const collected = metro === 'GYEONGGI' ? await collectGyeonggiFestivals() : await collectRegionFestivals(areaCode);
    const festivals = tourItemsToHome(collected.items);
    return res.json({
      success: true,
      metro,
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
    if (metro === 'SEOUL' || metro === 'GYEONGGI' || metro === 'INCHEON') {
      const source = metro === 'SEOUL' ? 'seoul' : metro === 'GYEONGGI' ? 'ggc' : 'ifac';
      const result = await syncOpenCultureEvents({ source });
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
