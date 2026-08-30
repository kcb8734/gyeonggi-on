import { persistTourFestivals, listFestivalCategoryCounts, writeTourSyncLog } from './festivalDbSync.js';
import { AREA_CODE_BY_METRO, REGION_LABEL, normalizeMetroId } from './metroLocalities.js';
import { searchFestival2, tourServiceKey } from './tourLive.js';

export async function syncTourMetroEvents(query = {}) {
  const nationwide = String(query.areaCode || query.metro || '').toLowerCase() === 'all'
    || String(query.metro || '').toUpperCase() === 'ALL';
  const metro = nationwide ? undefined : normalizeMetroId(query.metro);
  const label = nationwide ? '전국' : (REGION_LABEL[metro] || metro);
  const targetApi = nationwide ? 'searchFestival2' : `searchFestival2:${metro}`;
  if (!tourServiceKey()) {
    const message = 'TOUR_API_SERVICE_KEY가 없어 TourAPI 4.0을 호출하지 못했습니다.';
    console.error('[tour-sync] skip', { metro: metro || 'ALL', code: 'NO_KEY' });
    await writeTourSyncLog({ targetApi, fetched: 0, failed: 1, status: '키없음', message });
    return {
      success: false,
      source: 'tour',
      sourceLabel: `한국관광공사 TourAPI 4.0 ${label}`,
      targetApi,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      persisted: false,
      failed: 1,
      categories: [],
      message,
    };
  }
  try {
    const result = await searchFestival2({
      metro: nationwide ? undefined : metro,
      areaCode: nationwide ? 'all' : (query.areaCode || AREA_CODE_BY_METRO[metro]),
      month: query.month,
      year: query.year,
      numOfRows: query.numOfRows || 80,
    });
    const items = (result.festivals || []).map((item) => ({
      ...item,
      metro: item.metro || result.metro || metro,
    }));
    const persist = await persistTourFestivals(items, { source: 'tour', metro: nationwide ? undefined : metro });
    const categories = persist.ok ? await listFestivalCategoryCounts() : [];
    await writeTourSyncLog({
      targetApi,
      fetched: items.length,
      failed: persist.ok ? 0 : 1,
      status: persist.ok ? '정상' : '부분',
      message: persist.message,
    });
    return {
      success: true,
      source: 'tour',
      sourceLabel: `한국관광공사 TourAPI 4.0 ${label}`,
      targetApi,
      fetched: items.length,
      upserted: persist.upserted,
      skipped: persist.skipped,
      persisted: persist.ok,
      failed: persist.ok ? 0 : 1,
      categories,
      metro: result.metro || metro || 'ALL',
      message: persist.ok
        ? `${label} TourAPI ${persist.upserted}건을 DB에 동기화했습니다.`
        : `${label} TourAPI ${items.length}건을 수집했습니다. ${persist.message || ''}`.trim(),
    };
  } catch (err) {
    const message = err && err.message ? err.message : 'TourAPI 수집에 실패했습니다.';
    console.error('[tour-sync]', message);
    await writeTourSyncLog({ targetApi, fetched: 0, failed: 1, status: '실패', message });
    return {
      success: false,
      source: 'tour',
      sourceLabel: `한국관광공사 TourAPI 4.0 ${label}`,
      targetApi,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      persisted: false,
      failed: 1,
      categories: [],
      message,
    };
  }
}
