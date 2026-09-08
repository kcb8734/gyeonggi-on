import type { HomeFestival } from '../types/home';
import { METRO_REGIONS, normalizeMetroId } from '../constants/regions';
import { REGION_PRESETS } from '../constants/regionTour';
import { validLatLng } from './mapCamera';

function festivalKey(item: HomeFestival) {
  const title = String(item.title || '').trim();
  if (title) return `title:${title}`;
  return String(item.contentId || item.id || '').trim();
}

export function mergeFestivalSources(...groups: HomeFestival[][]) {
  const out: HomeFestival[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const item of group || []) {
      const key = festivalKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

export function matchesFestivalCategory(item: HomeFestival, category: string) {
  const wanted = String(category || '').trim();
  if (!wanted || wanted === '전체') return true;
  const source = String(item.source || '');
  const actual = String(item.category || '');
  if (wanted === '계절축제' && (actual === '계절축제' || source === 'excel' || source === 'survey' || source === 'xlsx')) {
    return true;
  }
  if (wanted === '문화/예술' && (actual === '문화/예술' || actual === '문화예술')) return true;
  return actual === wanted;
}

export function firstNonEmptyFestivals(...groups: HomeFestival[][]) {
  for (const group of groups) {
    if (group?.length) return group;
  }
  return [];
}

const SIDO_TOKENS: Array<[string, string]> = [
  ['서울특별시', 'SEOUL'], ['서울시', 'SEOUL'], ['서울온', 'SEOUL'],
  ['부산광역시', 'BUSAN'], ['부산온', 'BUSAN'], ['부산', 'BUSAN'],
  ['대구광역시', 'DAEGU'], ['대구온', 'DAEGU'], ['대구', 'DAEGU'],
  ['인천광역시', 'INCHEON'], ['인천온', 'INCHEON'], ['인천', 'INCHEON'],
  ['광주광역시', 'GWANGJU'], ['광주온', 'GWANGJU'],
  ['대전광역시', 'DAEJEON'], ['대전온', 'DAEJEON'], ['대전', 'DAEJEON'],
  ['울산광역시', 'ULSAN'], ['울산온', 'ULSAN'], ['울산', 'ULSAN'],
  ['세종특별자치시', 'SEJONG'], ['세종온', 'SEJONG'], ['세종시', 'SEJONG'], ['세종', 'SEJONG'],
  ['경기도', 'GYEONGGI'], ['경기온', 'GYEONGGI'], ['경기', 'GYEONGGI'],
  ['강원특별자치도', 'GANGWON'], ['강원도', 'GANGWON'], ['강원온', 'GANGWON'], ['강원', 'GANGWON'],
  ['충청북도', 'CHUNGBUK'], ['충북온', 'CHUNGBUK'], ['충북', 'CHUNGBUK'],
  ['충청남도', 'CHUNGNAM'], ['충남온', 'CHUNGNAM'], ['충남', 'CHUNGNAM'],
  ['전북특별자치도', 'JEONBUK'], ['전라북도', 'JEONBUK'], ['전북온', 'JEONBUK'], ['전북', 'JEONBUK'],
  ['전라남도', 'JEONNAM'], ['전남온', 'JEONNAM'], ['전남', 'JEONNAM'],
  ['경상북도', 'GYEONGBUK'], ['경북온', 'GYEONGBUK'], ['경북', 'GYEONGBUK'],
  ['경상남도', 'GYEONGNAM'], ['경남온', 'GYEONGNAM'], ['경남', 'GYEONGNAM'],
  ['제주특별자치도', 'JEJU'], ['제주온', 'JEJU'], ['제주도', 'JEJU'], ['서귀포', 'JEJU'], ['제주', 'JEJU'],
];

export function inferMetroFromPlace(value?: string | null): string | null {
  const hay = String(value || '').replace(/\s+/g, '');
  if (!hay) return null;
  if (hay.includes('광주광역') || hay.includes('광산구')) return 'GWANGJU';
  if (hay.includes('경기') && hay.includes('광주')) return 'GYEONGGI';
  for (const [token, metro] of SIDO_TOKENS) {
    if (hay.includes(token.replace(/\s+/g, ''))) return metro;
  }
  return null;
}

function regionSpan(metro: string) {
  const preset = REGION_PRESETS.find((item) => item.id === metro);
  if (!preset) return 1.2;
  return Math.max(preset.latitudeDelta, preset.longitudeDelta) * 1.05;
}

export function festivalBelongsToMetro(item: HomeFestival, metro: string): boolean {
  const wanted = normalizeMetroId(metro);
  const hay = `${item.title || ''} ${item.location_name || ''} ${item.municipality_name || ''}`;
  const inferred = inferMetroFromPlace(hay);
  if (inferred) return inferred === wanted;

  if (validLatLng(item.latitude, item.longitude)) {
    const preset = REGION_PRESETS.find((row) => row.id === wanted) ?? REGION_PRESETS.find((row) => row.id === 'GYEONGGI')!;
    const span = regionSpan(wanted);
    return Math.abs(item.latitude - preset.latitude) <= span
      && Math.abs(item.longitude - preset.longitude) <= span;
  }

  const tagged = String(item.metro || item.regionalZone || '').trim();
  if (tagged) return normalizeMetroId(tagged) === wanted;

  const area = String(item.areaCode || '').trim();
  if (area && area !== 'all') {
    const meta = METRO_REGIONS.find((row) => row.id === wanted);
    return area === String(meta?.tourAreaCode || '');
  }

  return false;
}

export function festivalsForMetro(items: HomeFestival[] | undefined, metro: string): HomeFestival[] {
  return (items || []).filter((item) => festivalBelongsToMetro(item, metro));
}
