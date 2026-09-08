import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { metroMatchIds } from '../constants/metroLocalities';
import { REGION_PRESETS, normalizeMetroId, regionById, regionalZoneFor } from '../constants/regionTour';
import { searchFestivals, toHomeFestival } from '../services/tourApiService';
import { festivalHasCoupon } from '../utils/festivalCoupon';
import { toNumber } from '../utils/geo';

const METRO_CENTERS: Record<string, { lat: number; lng: number }> = {
  SEOUL: { lat: 37.5665, lng: 126.9780 },
  BUSAN: { lat: 35.1796, lng: 129.0756 },
  DAEGU: { lat: 35.8714, lng: 128.6014 },
  INCHEON: { lat: 37.4563, lng: 126.7052 },
  GWANGJU: { lat: 35.1595, lng: 126.8526 },
  DAEJEON: { lat: 36.3504, lng: 127.3845 },
  ULSAN: { lat: 35.5384, lng: 129.3114 },
  SEJONG: { lat: 36.4800, lng: 127.2890 },
  GYEONGGI: { lat: 37.4138, lng: 127.5183 },
  GANGWON: { lat: 37.8228, lng: 128.1555 },
  CHUNGBUK: { lat: 36.6357, lng: 127.4914 },
  CHUNGNAM: { lat: 36.5184, lng: 126.8000 },
  JEONBUK: { lat: 35.7175, lng: 127.1530 },
  JEONNAM: { lat: 34.8161, lng: 126.4629 },
  GYEONGBUK: { lat: 36.4919, lng: 128.8889 },
  GYEONGNAM: { lat: 35.4606, lng: 128.2132 },
  JEJU: { lat: 33.4996, lng: 126.5312 },
};

function displayCategory(row: { category?: string | null; source?: string | null }) {
  const source = String(row.source || '');
  if (source === 'excel' || source === 'survey' || source === 'xlsx') return '계절축제';
  return row.category || '문화/예술';
}

function coordsFor(row: { latitude?: unknown; longitude?: unknown }, metro: string) {
  const lat = toNumber(row.latitude);
  const lng = toNumber(row.longitude);
  if (lat && lng) return { latitude: lat, longitude: lng };
  const center = METRO_CENTERS[metro] || METRO_CENTERS.GYEONGGI;
  return { latitude: center.lat, longitude: center.lng };
}

function mergeByTitle<T extends { title?: string | null; id?: string }>(...groups: T[][]) {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const item of group || []) {
      const key = String(item.title || item.id || '').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export const METRO_REGIONS = REGION_PRESETS.map((item) => ({
  id: item.id,
  label: item.label,
  ready: true,
}));

/** GET /api/home — 메인 피드 (광역 탭 + 쿠폰 캐러셀 + 인기 축제) */
export const getHomeFeed = async (req: Request, res: Response) => {
  const metro = normalizeMetroId(String(req.query.metro ?? 'GYEONGGI'));
  const category = typeof req.query.category === 'string' ? req.query.category : null;
  const matchIds = metroMatchIds(metro);

  const preset = regionById(metro);

  try {
    const festivalResult = await pool.query(
      `SELECT
         f.id, f.title, f.location_name, f.latitude, f.longitude,
         f.start_date, f.end_date, f.description, f.category, f.image_url, f.is_trending,
         f.tour_content_id, f.tel, f.source,
         COALESCE(f.metro_region, mu.metro_region) AS metro_region,
         mu.name AS municipality_name
       FROM festivals f
       LEFT JOIN municipalities mu ON mu.id = f.municipality_id
       WHERE COALESCE(f.metro_region, mu.metro_region, '') = ANY($1::text[])
       ORDER BY f.is_trending DESC, f.start_date ASC`,
      [matchIds],
    );

    const promotionResult = await pool.query(
      `SELECT
         dp.id, dp.title, dp.merchant_discount_rate, dp.gov_matching_rate, dp.total_discount_rate,
         dp.remaining_quantity, dp.total_quantity, dp.funding_type, dp.matching_status, dp.coupon_type,
         dp.max_discount_amount, f.id AS festival_id, f.title AS festival_title,
         m.business_name, m.category AS merchant_category
       FROM discount_promotions dp
       JOIN merchants m ON m.id = dp.merchant_id
       LEFT JOIN festivals f ON f.id = dp.festival_id
       LEFT JOIN municipalities mu ON mu.id = m.municipality_id
       WHERE dp.status = 'ACTIVE'
         AND dp.start_time <= now()
         AND dp.end_time >= now()
         AND dp.remaining_quantity > 0
         AND COALESCE(mu.metro_region, 'GYEONGGI') = ANY($1::text[])
       ORDER BY dp.total_discount_rate DESC, dp.remaining_quantity DESC
       LIMIT 20`,
      [matchIds],
    );

    const dbFestivals = festivalResult.rows.map((row) => {
      const geo = coordsFor(row, metro);
      return {
        id: row.tour_content_id ? `tour-${row.tour_content_id}` : row.id,
        contentId: row.tour_content_id ?? row.id,
        contentTypeId: '15',
        title: row.title,
        location_name: row.location_name,
        latitude: geo.latitude,
        longitude: geo.longitude,
        start_date: row.start_date,
        end_date: row.end_date,
        municipality_name: row.municipality_name ?? null,
        description: row.description ?? null,
        category: displayCategory(row),
        image_url: row.image_url,
        is_trending: Boolean(row.is_trending),
        source: row.source === 'excel' || row.source === 'survey' ? 'excel' : (row.source === 'tour' ? 'tour' : (row.source || 'db')),
        tel: row.tel ?? undefined,
        regionalZone: metro,
        metro,
        areaCode: preset.code,
        moiCode: preset.moiCode,
      };
    });

    let tourFestivals: typeof dbFestivals = [];
    try {
      const now = new Date();
      const live = await searchFestivals({
        areaCode: preset.code,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });
      if (live.length) {
        tourFestivals = live.map((item) => toHomeFestival(item, regionalZoneFor(preset.code, metro))) as typeof dbFestivals;
      }
    } catch (err) {
      console.warn('[getHomeFeed] TourAPI merge skipped:', err);
    }

    let festivals = mergeByTitle(dbFestivals, tourFestivals);

    const promotions = promotionResult.rows.map((row) => ({
      ...row,
      merchant_discount_rate: toNumber(row.merchant_discount_rate),
      gov_matching_rate: toNumber(row.gov_matching_rate),
      total_discount_rate: toNumber(row.total_discount_rate),
      remaining_quantity: toNumber(row.remaining_quantity),
      total_quantity: toNumber(row.total_quantity),
    }));

    const withCoupon = (item: (typeof festivals)[number]) => ({
      ...item,
      hasCoupon: festivalHasCoupon(item, promotions),
    });
    festivals = festivals.map(withCoupon);
    const popular = (category
      ? festivals.filter((item) => (
        category === '계절축제'
          ? (item.category === '계절축제' || item.source === 'excel')
          : item.category === category
      ))
      : festivals);

    return res.json({
      success: true,
      available: true,
      metro,
      regionalZone: metro,
      regions: METRO_REGIONS,
      festivals,
      promotions,
      popular,
    });
  } catch (err) {
    console.error('[getHomeFeed] Error:', err);
    return res.status(500).json({ success: false, message: '메인 피드를 불러오지 못했습니다.' });
  }
};
