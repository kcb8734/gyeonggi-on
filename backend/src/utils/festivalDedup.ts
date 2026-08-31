export function festivalDateYmd(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const text = String(value ?? '').trim();
  if (!text) return '';
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dotted = text.match(/(\d{4})[./](\d{1,2})[./](\d{1,2})/);
  if (dotted) return `${dotted[1]}-${dotted[2].padStart(2, '0')}-${dotted[3].padStart(2, '0')}`;
  const digits = text.replace(/\D/g, '');
  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return '';
}

export function normalizeFestivalTitle(title?: string | null) {
  return String(title || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/【[^】]*】/g, ' ')
    .replace(/제\s*\d+\s*회/g, ' ')
    .replace(/20\d{2}/g, ' ')
    .replace(/[^\w가-힣]/g, '')
    .toLowerCase()
    .trim();
}

export function festivalPlaceToken(item: { location_name?: unknown; municipality_name?: unknown; address?: unknown }) {
  return String(item.location_name || item.municipality_name || item.address || '')
    .replace(/[^\w가-힣]/g, '')
    .slice(0, 16);
}

export function sourceRank(source?: string | null) {
  const value = String(source || '').toLowerCase();
  if (value === 'tour' || value === 'tourapi' || value === 'searchfestival2') return 0;
  if (value === 'seoul' || value === 'culturaleventinfo') return 1;
  if (value === 'ggc' || value === 'gg' || value === 'ggculture') return 2;
  if (value === 'ifac' || value === 'incheon' || value === 'ifac-culture') return 3;
  if (value === 'muni') return 4;
  if (value === 'sample' || value === 'fallback') return 90;
  return 20;
}

function dayNumber(ymd: string) {
  if (!ymd) return null;
  const t = Date.parse(`${ymd}T00:00:00Z`);
  return Number.isNaN(t) ? null : Math.floor(t / 86400000);
}

function isSimilarFestival(
  a: { title?: unknown; start_date?: unknown; eventStartDate?: unknown; location_name?: unknown; municipality_name?: unknown; address?: unknown },
  b: { title?: unknown; start_date?: unknown; eventStartDate?: unknown; location_name?: unknown; municipality_name?: unknown; address?: unknown },
) {
  const ta = normalizeFestivalTitle(String(a?.title || ''));
  const tb = normalizeFestivalTitle(String(b?.title || ''));
  if (!ta || !tb) return false;
  const exactTitle = ta === tb;
  const fuzzyTitle = ta.length >= 6 && tb.length >= 6 && (ta.includes(tb) || tb.includes(ta));
  if (!exactTitle && !fuzzyTitle) return false;
  const da = dayNumber(festivalDateYmd(a?.start_date || a?.eventStartDate));
  const db = dayNumber(festivalDateYmd(b?.start_date || b?.eventStartDate));
  const dateHit = da == null || db == null || Math.abs(da - db) <= 3;
  if (!dateHit) return false;
  if (exactTitle) return true;
  const pa = festivalPlaceToken(a);
  const pb = festivalPlaceToken(b);
  if (!pa || !pb) return true;
  const coreA = pa.replace(/특별자치시|특별시|광역시|자치도|경기도|서울|인천/g, '');
  const coreB = pb.replace(/특별자치시|특별시|광역시|자치도|경기도|서울|인천/g, '');
  return pa.slice(0, 4) === pb.slice(0, 4)
    || pa.includes(pb.slice(0, 4))
    || pb.includes(pa.slice(0, 4))
    || (Boolean(coreA.slice(0, 2)) && coreA.slice(0, 2) === coreB.slice(0, 2));
}

export function mergeFestivalMasters<T extends { title?: unknown; source?: unknown; contentId?: unknown; id?: unknown; alsoFrom?: string[] }>(
  ...groups: Array<T[] | undefined>
): T[] {
  const items: T[] = [];
  for (const group of groups) {
    for (const item of group || []) {
      if (!item || !(item.title || item.contentId || item.id)) continue;
      if (sourceRank(String(item.source || '')) >= 90) continue;
      items.push(item);
    }
  }
  items.sort((a, b) => sourceRank(String(a.source || '')) - sourceRank(String(b.source || '')));
  const out: T[] = [];
  for (const item of items) {
    const master = out.find((row) => isSimilarFestival(row, item));
    if (master) {
      const extra = String(item.source || '').trim();
      if (extra && extra !== master.source) {
        const prev = Array.isArray(master.alsoFrom) ? master.alsoFrom : [];
        if (!prev.includes(extra)) master.alsoFrom = [...prev, extra];
      }
      continue;
    }
    out.push({ ...item });
  }
  return out;
}
