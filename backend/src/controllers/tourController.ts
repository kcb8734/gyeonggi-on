import { Request, Response } from 'express';
import {
  getTourDetail,
  searchFestivals,
  searchNearby,
} from '../services/tourApiService';
import { parseOptionalFloat } from '../utils/geo';

/**
 * GET /api/tour/festivals?areaCode=all&month=8&year=2026&category=계절축제
 * 기본은 전국(contentTypeId=15). 실패해도 더미 목록을 내려 화면이 비지 않게 한다.
 */
export const listFestivals = async (req: Request, res: Response) => {
  const areaCode = typeof req.query.areaCode === 'string' ? req.query.areaCode : 'all';
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const monthRaw = parseOptionalFloat(req.query.month);
  const yearRaw = parseOptionalFloat(req.query.year);
  const month = monthRaw != null ? Math.trunc(monthRaw) : undefined;
  const year = yearRaw != null ? Math.trunc(yearRaw) : undefined;

  if (month != null && (month < 1 || month > 12)) {
    return res.status(400).json({ success: false, message: 'month는 1~12 사이여야 합니다.' });
  }

  const festivals = await searchFestivals({ areaCode, month, year, category });
  return res.json({
    success: true,
    areaCode,
    month: month ?? null,
    year: year ?? new Date().getFullYear(),
    count: festivals.length,
    data: festivals,
  });
};

/**
 * GET /api/tour/nearby?mapX={lng}&mapY={lat}&radius=3000
 */
export const listNearby = async (req: Request, res: Response) => {
  const mapX = parseOptionalFloat(req.query.mapX ?? req.query.lng);
  const mapY = parseOptionalFloat(req.query.mapY ?? req.query.lat);
  const radius = parseOptionalFloat(req.query.radius) ?? 3000;
  const contentTypeId = typeof req.query.contentTypeId === 'string' ? req.query.contentTypeId : undefined;

  if (mapX == null || mapY == null) {
    return res.status(400).json({ success: false, message: 'mapX(경도), mapY(위도)가 필요합니다.' });
  }
  if (mapY < -90 || mapY > 90 || mapX < -180 || mapX > 180) {
    return res.status(400).json({ success: false, message: '유효하지 않은 좌표입니다.' });
  }

  const places = await searchNearby({ mapX, mapY, radius, contentTypeId });
  return res.json({
    success: true,
    mapX,
    mapY,
    radius,
    count: places.length,
    data: places,
  });
};

/**
 * GET /api/tour/detail/:contentId
 */
export const getDetail = async (req: Request, res: Response) => {
  const contentId = req.params.contentId;
  const contentTypeId = typeof req.query.contentTypeId === 'string' ? req.query.contentTypeId : undefined;
  if (!contentId) {
    return res.status(400).json({ success: false, message: '콘텐츠 ID가 필요합니다.' });
  }

  const detail = await getTourDetail(contentId, contentTypeId);
  return res.json({ success: true, data: detail });
};
