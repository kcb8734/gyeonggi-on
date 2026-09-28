import { isGenericFestivalOverview } from './genericOverview.js';
import { summarizeFestival } from './geminiFestival.js';
import { findBuiltinTourById, looksLikeKorTourId, getTourDetail2 } from './tourLive.js';

export { looksLikeKorTourId };

export function homeRowToDetail(row, contentId) {
  const title = String(row?.title || '').trim();
  const overview = String(row?.overview || row?.description || '').trim();
  return {
    contentId: String(row?.contentId || contentId || '').trim(),
    contentTypeId: String(row?.contentTypeId || '15'),
    title: title || '축제 상세',
    overview,
    address: String(row?.address || row?.location_name || '').trim() || '주소 확인 중',
    tel: row?.tel || undefined,
    homepage: row?.homepage || undefined,
    firstImage: row?.firstImage || row?.image_url || undefined,
    mapX: Number(row?.mapX || row?.longitude || 0),
    mapY: Number(row?.mapY || row?.latitude || 0),
    eventStartDate: row?.eventStartDate || row?.start_date || '',
    eventEndDate: row?.eventEndDate || row?.end_date || '',
    eventPlace: row?.eventPlace || undefined,
    playtime: row?.playtime || undefined,
    fee: row?.fee || undefined,
    images: (row?.firstImage || row?.image_url)
      ? [{ originUrl: row.firstImage || row.image_url }]
      : [],
    category: row?.category || undefined,
  };
}

export function queryToDetail(contentId, query = {}) {
  const title = String(query.title || '').trim();
  return {
    contentId: String(contentId || '').trim(),
    contentTypeId: String(query.contentTypeId || '15'),
    title: title || '축제 상세',
    overview: '',
    address: String(query.address || query.place || '').trim() || '주소 확인 중',
    tel: query.tel || undefined,
    homepage: query.homepage || undefined,
    firstImage: query.imageUrl || query.firstImage || undefined,
    mapX: Number(query.longitude || query.mapX || 0),
    mapY: Number(query.latitude || query.mapY || 0),
    eventStartDate: query.startDate || query.eventStartDate || '',
    eventEndDate: query.endDate || query.eventEndDate || '',
    images: (query.imageUrl || query.firstImage)
      ? [{ originUrl: query.imageUrl || query.firstImage }]
      : [],
    category: query.category || undefined,
  };
}

export function needsGeminiOverview(overview) {
  if (isGenericFestivalOverview(overview)) return true;
  const compact = String(overview || '').replace(/\s+/g, '');
  return compact.length < 80;
}

export async function attachGeminiOverview(detail, query = {}, options = {}) {
  if (!detail || !String(detail.title || '').trim() || detail.title === '축제 상세') return detail;
  if (!needsGeminiOverview(detail.overview)) return detail;
  const summarize = options.summarizeFestival || summarizeFestival;
  const summary = await summarize({
    title: detail.title,
    place: detail.address,
    startDate: detail.eventStartDate,
    endDate: detail.eventEndDate,
    metro: query.metro || '',
    category: detail.category || query.category || '',
    overview: isGenericFestivalOverview(detail.overview) ? '' : detail.overview,
  }, { timeoutMs: Number(options.timeoutMs) || 12000, store: options.store }).catch(() => null);
  if (!summary || summary.source !== 'gemini' || !summary.overview) return detail;
  if (isGenericFestivalOverview(summary.overview)) return detail;
  return {
    ...detail,
    overview: summary.overview,
    highlights: summary.highlights,
    tips: summary.tips,
    aiSource: 'gemini',
    aiModel: summary.model,
  };
}

export async function resolveTourDetail(contentId, query = {}, options = {}) {
  const id = String(contentId || '').trim();
  const getDetail = options.getTourDetail2 || getTourDetail2;
  if (looksLikeKorTourId(id)) {
    try {
      const live = await getDetail(id, query.contentTypeId);
      if (live) return live;
    } catch {
      // UUID가 아닌데도 TourAPI에 없으면 아래 합성으로 이어 간다.
    }
  }
  const builtin = findBuiltinTourById(id);
  if (builtin) return homeRowToDetail(builtin, id);
  const cached = typeof options.findCached === 'function' ? await options.findCached(id) : null;
  if (cached) return homeRowToDetail(cached, id);
  if (String(query.title || '').trim()) return queryToDetail(id, query);
  const err = new Error('해당 관광 정보를 찾을 수 없습니다.');
  err.status = 404;
  throw err;
}
