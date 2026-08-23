import { pool } from '../db/pool';
import { municipalityFromAddress, municipalityRegionCode } from '../constants/gyeonggiCities';
import {
  searchFestival1,
  TourApiError,
  toHomeFestival,
  ymd,
  type TourFestival,
} from './tourApiService';

const MAX_RETRIES = 2;

export interface FestivalSyncResult {
  success: boolean;
  source: 'searchFestival1' | 'searchFestival2' | 'none';
  fetched: number;
  upserted: number;
  skipped: number;
  message: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(label: string, fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const message = err instanceof Error ? err.message : String(err);
      const status = err instanceof TourApiError ? err.statusCode : 0;
      console.error(`[festival-sync] ${label} ${attempt}회 실패: ${message}`);
      if (status >= 400 && status < 500) break;
      if (attempt <= retries) await sleep(400 * attempt);
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

export async function collectRegionFestivals(areaCode = '31'): Promise<{ items: TourFestival[]; source: FestivalSyncResult['source'] }> {
  const now = new Date();
  const eventStartDate = ymd(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const items = await withRetry(`searchFestival2:${areaCode}`, () => searchFestival1({
    areaCode,
    eventStartDate,
    numOfRows: 120,
  }));
  return { items, source: items.length ? 'searchFestival2' : 'none' };
}

export async function collectGyeonggiFestivals() {
  return collectRegionFestivals('31');
}

export async function ensureMunicipalityId(address: string): Promise<string | null> {
  const name = municipalityFromAddress(address);
  const regionCode = municipalityRegionCode(name);
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM municipalities WHERE name = $1 OR region_code = $2 LIMIT 1`,
    [name, regionCode],
  );
  if (existing.rowCount) return existing.rows[0].id;
  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO municipalities (name, region_code, budget_balance)
     VALUES ($1, $2, 0)
     ON CONFLICT (region_code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name, regionCode],
  );
  return inserted.rows[0]?.id ?? null;
}

export function isUpsertable(festival: TourFestival): boolean {
  return Boolean(festival.contentId && festival.title && festival.eventStartDate);
}

export async function upsertTourFestivals(items: TourFestival[]): Promise<{ upserted: number; skipped: number }> {
  let upserted = 0;
  let skipped = 0;
  for (const item of items) {
    if (!isUpsertable(item)) {
      skipped += 1;
      continue;
    }
    const municipalityId = await ensureMunicipalityId(item.address);
    const start = item.eventStartDate.slice(0, 10);
    const end = (item.eventEndDate || item.eventStartDate).slice(0, 10);
    await pool.query(
      `INSERT INTO festivals (
         municipality_id, title, description, start_date, end_date,
         location_name, latitude, longitude, category, image_url, is_trending,
         tour_content_id, tel, source
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10, $11,
         $12, $13, 'tour'
       )
       ON CONFLICT (tour_content_id) DO UPDATE SET
         title = EXCLUDED.title,
         description = COALESCE(EXCLUDED.description, festivals.description),
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         location_name = EXCLUDED.location_name,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         category = EXCLUDED.category,
         image_url = COALESCE(EXCLUDED.image_url, festivals.image_url),
         is_trending = EXCLUDED.is_trending,
         tel = COALESCE(EXCLUDED.tel, festivals.tel),
         source = 'tour'`,
      [
        municipalityId,
        item.title.slice(0, 100),
        item.overview ?? null,
        start,
        end,
        (item.eventPlace || item.address || '').slice(0, 150) || null,
        item.mapY || null,
        item.mapX || null,
        item.category,
        item.firstImage ?? null,
        Boolean(item.firstImage),
        item.contentId,
        item.tel ?? null,
      ],
    );
    upserted += 1;
  }
  return { upserted, skipped };
}

export async function syncGyeonggiFestivals(): Promise<FestivalSyncResult> {
  try {
    const collected = await collectGyeonggiFestivals();
    if (!collected.items.length) {
      return {
        success: false,
        source: collected.source,
        fetched: 0,
        upserted: 0,
        skipped: 0,
        message: 'TourAPI에서 경기도 축제를 가져오지 못했습니다.',
      };
    }
    const { upserted, skipped } = await upsertTourFestivals(collected.items);
    return {
      success: true,
      source: collected.source,
      fetched: collected.items.length,
      upserted,
      skipped,
      message: `경기도 축제 ${upserted}건을 동기화했습니다. (${collected.source})`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[festival-sync] 동기화 실패:', message);
    return {
      success: false,
      source: 'none',
      fetched: 0,
      upserted: 0,
      skipped: 0,
      message,
    };
  }
}

export async function syncNationwideFestivals(): Promise<FestivalSyncResult> {
  const { ALL_TOUR_AREA_CODES } = await import('../constants/regionTour');
  let fetched = 0;
  let upserted = 0;
  let skipped = 0;
  let source: FestivalSyncResult['source'] = 'none';
  for (const areaCode of ALL_TOUR_AREA_CODES) {
    try {
      const collected = await collectRegionFestivals(areaCode);
      fetched += collected.items.length;
      if (collected.items.length) source = collected.source;
      const result = await upsertTourFestivals(collected.items);
      upserted += result.upserted;
      skipped += result.skipped;
    } catch (err) {
      console.error('[festival-sync] 권역 동기화 실패', areaCode, err);
    }
  }
  return {
    success: fetched > 0,
    source,
    fetched,
    upserted,
    skipped,
    message: `전국 권역 축제 ${upserted}건을 동기화했습니다.`,
  };
}

export function tourItemsToHome(items: TourFestival[]) {
  return items.map(toHomeFestival);
}
