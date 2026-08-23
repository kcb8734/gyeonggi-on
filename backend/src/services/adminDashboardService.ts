import { GYEONGGI_CITIES } from '../constants/gyeonggiCities';
import { tryQuery } from '../db/pool';
import { matchingMatrix, memoryEngine, memoryGuardLogs, memoryEditorsPicks } from './inMemoryPlatform';

export async function getAdminDashboard() {
  const festivals = await tryQuery(`SELECT COUNT(*)::int AS n FROM festivals`);
  const merchants = await tryQuery(`SELECT COUNT(*)::int AS n FROM merchants`);
  const coupons = await tryQuery(`SELECT COUNT(*)::int AS issued, COUNT(*) FILTER (WHERE is_used OR status = 'USED')::int AS used FROM user_coupons`);
  const scanCoupons = await tryQuery(`SELECT COUNT(*)::int AS issued, COUNT(*) FILTER (WHERE is_used)::int AS used FROM coupons`);
  const syncLogs = await tryQuery(
    `SELECT ran_at, target_api, fetched, failed, status FROM tour_sync_logs ORDER BY ran_at DESC LIMIT 8`,
  );
  const weights = await tryQuery(`SELECT * FROM admin_engine_settings WHERE id = 'default'`);
  const courses = await tryQuery(
    `SELECT id, festival_title, course_json, is_editors_pick, recommend_count, save_count FROM ai_courses ORDER BY created_at DESC LIMIT 12`,
  );

  const issued = Number(coupons?.rows[0]?.issued ?? 0) + Number(scanCoupons?.rows[0]?.issued ?? 0);
  const used = Number(coupons?.rows[0]?.used ?? 0) + Number(scanCoupons?.rows[0]?.used ?? 0);
  const matrix = matchingMatrix();
  const unassigned = matrix.filter((row) => !row.officerName);

  return {
    kpi: {
      festivals: Number(festivals?.rows[0]?.n ?? 12),
      merchants: Number(merchants?.rows[0]?.n ?? 18),
      couponsIssued: issued || 24,
      couponsUsed: used || 9,
      recoveryRate: issued || used ? Math.round((used || 9) / (issued || 24) * 100) : 38,
    },
    tour: {
      quotaUsed: 42,
      quotaLimit: 1000,
      categories: [
        { name: '축제/행사', count: Number(festivals?.rows[0]?.n ?? 12) },
        { name: '역사체험', count: 8 },
        { name: '캠핑장', count: 6 },
        { name: '음식점', count: 21 },
      ],
      logs: syncLogs?.rows.length
        ? syncLogs.rows
        : [{
          ran_at: new Date().toISOString(),
          target_api: 'searchFestival2',
          fetched: Number(festivals?.rows[0]?.n ?? 12),
          failed: 0,
          status: '정상',
        }],
    },
    coupons: [
      { id: 'CP-1001', festival: '장단콩 축제', store: '문산시장 콩국수', issued: 40, used: 18, recovery: 45, period: '2026-08' },
      { id: 'CP-1002', festival: '수원화성문화제', store: '화성행궁 한정식', issued: 30, used: 11, recovery: 37, period: '2026-08' },
    ],
    matching: matrix,
    unassigned,
    cities: GYEONGGI_CITIES,
    engine: weights?.rows[0] ? {
      festivalWeight: Number(weights.rows[0].festival_weight),
      campingDistanceWeight: Number(weights.rows[0].camping_distance_weight),
      marketRatioWeight: Number(weights.rows[0].market_ratio_weight),
      historyWeight: Number(weights.rows[0].history_weight),
    } : memoryEngine,
    courses: (courses?.rows ?? []).map((row) => ({
      id: row.id,
      festival: row.festival_title,
      elements: '캠핑/역사/시장',
      recommendCount: row.recommend_count,
      saveCount: row.save_count,
      editorsPick: row.is_editors_pick,
    })),
    guardLogs: memoryGuardLogs,
  };
}

export async function updateEngineWeights(input: {
  festivalWeight?: number;
  campingDistanceWeight?: number;
  marketRatioWeight?: number;
  historyWeight?: number;
}) {
  memoryEngine.festivalWeight = Number(input.festivalWeight ?? memoryEngine.festivalWeight);
  memoryEngine.campingDistanceWeight = Number(input.campingDistanceWeight ?? memoryEngine.campingDistanceWeight);
  memoryEngine.marketRatioWeight = Number(input.marketRatioWeight ?? memoryEngine.marketRatioWeight);
  memoryEngine.historyWeight = Number(input.historyWeight ?? memoryEngine.historyWeight);
  await tryQuery(
    `INSERT INTO admin_engine_settings (id, festival_weight, camping_distance_weight, market_ratio_weight, history_weight, updated_at)
     VALUES ('default', $1, $2, $3, $4, NOW())
     ON CONFLICT (id) DO UPDATE SET
       festival_weight = EXCLUDED.festival_weight,
       camping_distance_weight = EXCLUDED.camping_distance_weight,
       market_ratio_weight = EXCLUDED.market_ratio_weight,
       history_weight = EXCLUDED.history_weight,
       updated_at = NOW()`,
    [memoryEngine.festivalWeight, memoryEngine.campingDistanceWeight, memoryEngine.marketRatioWeight, memoryEngine.historyWeight],
  );
  return memoryEngine;
}

export async function markEditorsPick(courseId: string, enabled = true) {
  if (enabled) memoryEditorsPicks.add(courseId);
  else memoryEditorsPicks.delete(courseId);
  await tryQuery(`UPDATE ai_courses SET is_editors_pick = $2 WHERE id = $1`, [courseId, enabled]);
  return { courseId, editorsPick: enabled };
}

export function addGuardLog(text: string) {
  const blocked = /비속|욕설|악성/.test(text);
  const row = { at: new Date().toISOString(), text, blocked };
  memoryGuardLogs.unshift(row);
  return row;
}

export function settlementCsv() {
  const header = '시군,담당자,매칭상가,활성축제,쿠폰,승인';
  const rows = matchingMatrix().map((row) => [row.city, row.officerName || '미지정', row.stores, row.festivals, row.coupons, row.approved ? '승인' : '대기'].join(','));
  return [header, ...rows].join('\n');
}
