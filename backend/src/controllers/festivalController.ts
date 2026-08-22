import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { haversineKmSql, parseOptionalFloat, toNumber } from '../utils/geo';

const DEFAULT_RADIUS_KM = 50;
const MAX_RADIUS_KM = 200;
const NEARBY_LIMIT = 50;

interface FestivalRow {
  id: string;
  title: string;
  location_name: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  start_date: string;
  end_date: string;
  municipality_name?: string;
  description?: string | null;
  distance_km?: string | number | null;
  category?: string | null;
  image_url?: string | null;
  is_trending?: boolean;
}

interface MerchantMapRow {
  id: string;
  business_name: string;
  category: string;
  address: string;
  latitude: string | number | null;
  longitude: string | number | null;
  total_discount_rate: string | number;
  promotion_id: string;
  remaining_quantity: string | number;
  max_discount_amount: string | number | null;
}

function toFestivalPin(row: FestivalRow) {
  return {
    id: row.id,
    title: row.title,
    location_name: row.location_name,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    start_date: row.start_date,
    end_date: row.end_date,
    municipality_name: row.municipality_name ?? null,
    description: row.description ?? null,
    distance_km: row.distance_km != null ? toNumber(row.distance_km) : null,
    category: row.category ?? '문화/예술',
    image_url: row.image_url ?? null,
    is_trending: Boolean(row.is_trending),
  };
}

function toMerchantPin(row: MerchantMapRow) {
  return {
    id: row.id,
    business_name: row.business_name,
    category: row.category,
    address: row.address,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    total_discount_rate: toNumber(row.total_discount_rate),
    promotion_id: row.promotion_id,
    remaining_quantity: toNumber(row.remaining_quantity),
    max_discount_amount: row.max_discount_amount != null ? toNumber(row.max_discount_amount) : null,
  };
}

/**
 * GET /api/festivals/nearby
 * - merchant_id: 해당 점포와 같은 지자체 축제 (사장님 등록 화면)
 * - latitude/longitude/radius_km: 현재 위치 기준 주변 축제 (고객 메인 지도)
 * - 파라미터 없음: 진행 중/예정 축제 전체
 */
export const getNearbyFestivals = async (req: Request, res: Response) => {
  const merchantId = typeof req.query.merchant_id === 'string' ? req.query.merchant_id : null;
  const latitude = parseOptionalFloat(req.query.latitude ?? req.query.lat);
  const longitude = parseOptionalFloat(req.query.longitude ?? req.query.lng);
  const radiusRaw = parseOptionalFloat(req.query.radius_km);
  const radiusKm = Math.min(Math.max(radiusRaw ?? DEFAULT_RADIUS_KM, 1), MAX_RADIUS_KM);

  try {
    if (merchantId) {
      const merchant = await pool.query(
        `SELECT id, municipality_id FROM merchants WHERE id = $1`,
        [merchantId],
      );
      if (merchant.rowCount === 0) {
        return res.status(404).json({ success: false, message: '등록된 소상공인 정보를 찾을 수 없습니다.' });
      }

      const result = await pool.query<FestivalRow>(
        `SELECT
           f.id, f.title, f.location_name, f.latitude, f.longitude,
           f.start_date, f.end_date, f.description, f.category, f.image_url, f.is_trending,
           mu.name AS municipality_name
         FROM festivals f
         JOIN municipalities mu ON mu.id = f.municipality_id
         WHERE f.municipality_id = $1
           AND f.end_date >= CURRENT_DATE
         ORDER BY f.start_date ASC
         LIMIT $2`,
        [merchant.rows[0].municipality_id, NEARBY_LIMIT],
      );

      return res.json({ success: true, data: result.rows.map(toFestivalPin) });
    }

    if (latitude != null && longitude != null) {
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({ success: false, message: '유효하지 않은 좌표입니다.' });
      }

      const distanceSql = haversineKmSql(1, 2, 'f.latitude', 'f.longitude');
      const result = await pool.query<FestivalRow>(
        `SELECT
           f.id, f.title, f.location_name, f.latitude, f.longitude,
           f.start_date, f.end_date, f.description, f.category, f.image_url, f.is_trending,
           mu.name AS municipality_name,
           (${distanceSql}) AS distance_km
         FROM festivals f
         JOIN municipalities mu ON mu.id = f.municipality_id
         WHERE f.latitude IS NOT NULL
           AND f.longitude IS NOT NULL
           AND f.end_date >= CURRENT_DATE
           AND (${distanceSql}) <= $3
         ORDER BY distance_km ASC
         LIMIT $4`,
        [latitude, longitude, radiusKm, NEARBY_LIMIT],
      );

      return res.json({ success: true, data: result.rows.map(toFestivalPin) });
    }

    const result = await pool.query<FestivalRow>(
      `SELECT
         f.id, f.title, f.location_name, f.latitude, f.longitude,
         f.start_date, f.end_date, f.description, f.category, f.image_url, f.is_trending,
         mu.name AS municipality_name
       FROM festivals f
       JOIN municipalities mu ON mu.id = f.municipality_id
       WHERE f.end_date >= CURRENT_DATE
         AND f.latitude IS NOT NULL
         AND f.longitude IS NOT NULL
       ORDER BY f.start_date ASC
       LIMIT $1`,
      [NEARBY_LIMIT],
    );

    return res.json({ success: true, data: result.rows.map(toFestivalPin) });
  } catch (err) {
    console.error('[getNearbyFestivals] Error:', err);
    return res.status(500).json({ success: false, message: '주변 축제 목록을 불러오지 못했습니다.' });
  }
};

/**
 * GET /api/festivals/:id/map
 * 축제 핀 + 해당 축제에 활성 프로모션이 있는 제휴업소 핀
 */
export const getFestivalMap = async (req: Request, res: Response) => {
  const festivalId = req.params.id;
  if (!festivalId) {
    return res.status(400).json({ success: false, message: '축제 ID가 필요합니다.' });
  }

  try {
    const festivalResult = await pool.query<FestivalRow>(
      `SELECT
         f.id, f.title, f.location_name, f.latitude, f.longitude,
         f.start_date, f.end_date, f.description, f.category, f.image_url, f.is_trending,
         mu.name AS municipality_name
       FROM festivals f
       JOIN municipalities mu ON mu.id = f.municipality_id
       WHERE f.id = $1`,
      [festivalId],
    );

    if (festivalResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: '축제 정보를 찾을 수 없습니다.' });
    }

    const festivalRow = festivalResult.rows[0];
    if (festivalRow.latitude == null || festivalRow.longitude == null) {
      return res.status(422).json({ success: false, message: '축제 위치 정보가 등록되지 않았습니다.' });
    }

    // 업소당 할인율이 가장 높은 활성 프로모션 1건
    const merchantResult = await pool.query<MerchantMapRow>(
      `SELECT DISTINCT ON (m.id)
         m.id, m.business_name, m.category, m.address,
         m.latitude, m.longitude,
         dp.total_discount_rate, dp.id AS promotion_id,
         dp.remaining_quantity, dp.max_discount_amount
       FROM merchants m
       JOIN discount_promotions dp ON dp.merchant_id = m.id
       WHERE dp.festival_id = $1
         AND dp.status = 'ACTIVE'
         AND dp.start_time <= now()
         AND dp.end_time >= now()
         AND dp.remaining_quantity > 0
         AND m.latitude IS NOT NULL
         AND m.longitude IS NOT NULL
       ORDER BY m.id, dp.total_discount_rate DESC, dp.remaining_quantity DESC`,
      [festivalId],
    );

    return res.json({
      success: true,
      festival: toFestivalPin(festivalRow),
      merchants: merchantResult.rows.map(toMerchantPin),
    });
  } catch (err) {
    console.error('[getFestivalMap] Error:', err);
    return res.status(500).json({ success: false, message: '지도 데이터를 불러오지 못했습니다.' });
  }
};
