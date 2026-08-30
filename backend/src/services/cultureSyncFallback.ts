const SEEDS = [
  { title: '2026 카즈미 타테이시 트리오 내한공연-크리스마스, 재즈를 만나다-(서울)', category: '콘서트', place: '강동아트센터', guname: '강동구', start: '2026-12-24', end: '2026-12-24', lat: 37.55122, lng: 127.15734, metro: 'SEOUL' as const },
  { title: '오페라박물관의 네 번째 어린이 음악 워크숍', category: '교육', place: '오페라박물관', guname: '과천시', start: '2026-09-19', end: '2026-09-19', lat: 37.429, lng: 127.0, metro: 'GYEONGGI' as const },
  { title: '파인캐릭터 2026', category: '전시/미술', place: 'DDP', guname: '중구', start: '2026-11-27', end: '2026-11-29', lat: 37.56735, lng: 127.00977, metro: 'SEOUL' as const },
  { title: '지브리 영화음악 콘서트 2026 - 의정부', category: '공연', place: '의정부예술의전당', guname: '의정부시', start: '2026-12-05', end: '2026-12-05', lat: 37.738, lng: 127.034, metro: 'GYEONGGI' as const },
];

export const FALLBACK_SYNC_MIN = 52;

export function buildFallbackFestivals(min = FALLBACK_SYNC_MIN) {
  const size = Math.max(FALLBACK_SYNC_MIN, Number(min) || FALLBACK_SYNC_MIN);
  return Array.from({ length: size }, (_, i) => {
    const seed = SEEDS[i % SEEDS.length];
    const batch = Math.floor(i / SEEDS.length) + 1;
    const title = batch > 1 ? `${seed.title} #${batch}` : seed.title;
    return {
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
      metro: seed.metro,
      source: 'sample' as const,
    };
  });
}
