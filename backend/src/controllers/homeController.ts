import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { toNumber } from '../utils/geo';

const READY_METROS = new Set(['GYEONGGI']);

export const METRO_REGIONS = [
  { id: 'GYEONGGI', label: '경기온', ready: true },
  { id: 'SEOUL', label: '서울온', ready: false },
  { id: 'GANGWON', label: '강원온', ready: false },
  { id: 'CHUNGCHEONG', label: '충청온', ready: false },
  { id: 'JEOLLA', label: '전라온', ready: false },
  { id: 'GYEONGSANG', label: '경상온', ready: false },
  { id: 'JEJU', label: '제주온', ready: false },
];

/** GET /api/home — 메인 피드 (광역 탭 + 쿠폰 캐러셀 + 인기 축제) */
export const getHomeFeed = async (req: Request, res: Response) => {
  const metro = String(req.query.metro ?? 'GYEONGGI').toUpperCase();
  const category = typeof req.query.category === 'string' ? req.query.category : null;

  if (!READY_METROS.has(metro)) {
    return res.json({
      success: true,
      available: false,
      message: '해당 지역 서비스 준비 중입니다',
      metro,
      regions: METRO_REGIONS,
      festivals: [],
      promotions: [],
      popular: [],
    });
  }

  try {
    const festivalResult = await pool.query(
      `SELECT
         f.id, f.title, f.location_name, f.latitude, f.longitude,
         f.start_date, f.end_date, f.description, f.category, f.image_url, f.is_trending,
         mu.name AS municipality_name
       FROM festivals f
       JOIN municipalities mu ON mu.id = f.municipality_id
       WHERE COALESCE(mu.metro_region, 'GYEONGGI') = $1
         AND f.end_date >= CURRENT_DATE
         AND f.latitude IS NOT NULL
       ORDER BY f.is_trending DESC, f.start_date ASC`,
      [metro],
    );

    const promotionResult = await pool.query(
      `SELECT
         dp.id, dp.title, dp.merchant_discount_rate, dp.gov_matching_rate, dp.total_discount_rate,
         dp.remaining_quantity, dp.total_quantity, dp.funding_type, dp.matching_status,
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
         AND COALESCE(mu.metro_region, 'GYEONGGI') = $1
       ORDER BY dp.total_discount_rate DESC, dp.remaining_quantity DESC
       LIMIT 20`,
      [metro],
    );

    const festivals = festivalResult.rows.map((row) => ({
      ...row,
      latitude: toNumber(row.latitude),
      longitude: toNumber(row.longitude),
    }));

    const popular = category
      ? festivals.filter((item) => item.category === category)
      : festivals;

    return res.json({
      success: true,
      available: true,
      metro,
      regions: METRO_REGIONS,
      festivals,
      promotions: promotionResult.rows.map((row) => ({
        ...row,
        merchant_discount_rate: toNumber(row.merchant_discount_rate),
        gov_matching_rate: toNumber(row.gov_matching_rate),
        total_discount_rate: toNumber(row.total_discount_rate),
        remaining_quantity: toNumber(row.remaining_quantity),
        total_quantity: toNumber(row.total_quantity),
      })),
      popular,
    });
  } catch (err) {
    console.error('[getHomeFeed] Error:', err);
    return res.status(500).json({ success: false, message: '메인 피드를 불러오지 못했습니다.' });
  }
};
