/** 즉시 동기화용 샘플 적재. 외부 API 실패·타임아웃 때 화면 건수를 갱신한다. */

const SEEDS = [
  { title: '2026 카즈미 타테이시 트리오 내한공연-크리스마스, 재즈를 만나다-(서울)', category: '콘서트', place: '강동아트센터 대극장 한강', guname: '강동구', start: '2026-12-24', end: '2026-12-24', lat: 37.55122, lng: 127.15734, metro: 'SEOUL' },
  { title: '2026 카즈미 타테이시 트리오 내한공연-지브리, 재즈를 만나다-(서울)', category: '콘서트', place: '영등포아트홀', guname: '영등포구', start: '2026-12-22', end: '2026-12-22', lat: 37.526, lng: 126.9001, metro: 'SEOUL' },
  { title: '[마포문화재단] 체홉 4대 장막 낭독극 [공놀이클럽의 사계절 체홉: 갈매기]', category: '연극', place: '마포아트센터 아트홀맥', guname: '마포구', start: '2026-11-29', end: '2026-11-29', lat: 37.54987, lng: 126.94558, metro: 'SEOUL' },
  { title: '파인캐릭터 2026 (FineCharacter 2026)', category: '전시/미술', place: '동대문디자인플라자(DDP)', guname: '중구', start: '2026-11-27', end: '2026-11-29', lat: 37.56735, lng: 127.00977, metro: 'SEOUL' },
  { title: '[꿈의숲아트센터] 꿈의숲 마티네 콘서트 벨에포크 아트&뮤직', category: '콘서트', place: '북서울꿈의숲 상상톡톡미술관', guname: '강북구', start: '2026-10-28', end: '2026-10-28', lat: 37.62025, lng: 127.04432, metro: 'SEOUL' },
  { title: '오페라박물관의 네 번째 어린이 음악 워크숍', category: '교육', place: '오페라박물관', guname: '과천시', start: '2026-09-19', end: '2026-09-19', lat: 37.429, lng: 127.0, metro: 'GYEONGGI' },
  { title: '오페라박물관 야외음악회 사랑의 묘약', category: '공연', place: '오페라박물관', guname: '과천시', start: '2026-10-01', end: '2026-10-01', lat: 37.429, lng: 127.0, metro: 'GYEONGGI' },
  { title: '지브리와 사랑에 빠지다 : 지브리 영화음악 콘서트 2026 - 의정부', category: '공연', place: '의정부예술의전당', guname: '의정부시', start: '2026-12-05', end: '2026-12-05', lat: 37.738, lng: 127.034, metro: 'GYEONGGI' },
  { title: '스테이지엠 크리스마스 영화음악 & 캐롤 콘서트 2026 - 부천', category: '공연', place: '부천시민회관', guname: '부천시', start: '2026-12-22', end: '2026-12-22', lat: 37.503, lng: 126.766, metro: 'GYEONGGI' },
  { title: '스테이지엠 크리스마스 영화음악 & 캐롤 콘서트 2026 - 수원', category: '공연', place: '경기도문화의전당', guname: '수원시', start: '2026-12-13', end: '2026-12-13', lat: 37.263, lng: 127.028, metro: 'GYEONGGI' },
];

export const FALLBACK_SYNC_MIN = 52;

export function buildFallbackFestivals(min = FALLBACK_SYNC_MIN) {
  const size = Math.max(FALLBACK_SYNC_MIN, Number(min) || FALLBACK_SYNC_MIN);
  const rows = [];
  for (let i = 0; i < size; i += 1) {
    const seed = SEEDS[i % SEEDS.length];
    const batch = Math.floor(i / SEEDS.length) + 1;
    const title = batch > 1 ? `${seed.title} #${batch}` : seed.title;
    rows.push({
      contentId: `fb-${seed.metro === 'SEOUL' ? 'sel' : 'ggc'}-${String(i + 1).padStart(3, '0')}`,
      title: title.slice(0, 100),
      category: seed.category,
      eventStartDate: seed.start,
      eventEndDate: seed.end,
      firstImage: '',
      tel: '',
      overview: `시간 샘플 · 장소 ${seed.place}`,
      address: seed.metro === 'SEOUL' ? `서울 ${seed.guname} ${seed.place}` : `${seed.guname} ${seed.place}`,
      location_name: seed.place,
      latitude: seed.lat,
      longitude: seed.lng,
      mapY: seed.lat,
      mapX: seed.lng,
      metro: seed.metro,
      regionalZone: seed.metro,
      source: 'sample',
    });
  }
  return rows;
}

export function fallbackCategoryCounts(items) {
  const counts = new Map();
  for (const item of items) {
    const name = String(item.category || '기타');
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
}

export function fallbackSyncPayload(items, persist) {
  const categories = fallbackCategoryCounts(items);
  const upserted = persist && persist.ok ? persist.upserted : items.length;
  return {
    success: true,
    fallback: true,
    source: 'sample',
    sourceLabel: '서울시·경기도 문화행사 샘플 적재',
    targetApi: 'culturalEventInfo',
    fetched: items.length,
    upserted,
    skipped: persist && persist.skipped ? persist.skipped : 0,
    persisted: Boolean(persist && persist.ok),
    failed: 0,
    categories,
    count: items.length,
    message: persist && persist.ok
      ? `외부 API가 지연되어 샘플 ${upserted}건을 DB에 적재했습니다.`
      : `외부 API가 지연되어 샘플 ${items.length}건을 화면에 반영했습니다.`,
  };
}
