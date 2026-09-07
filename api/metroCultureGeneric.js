import { persistTourFestivals, listFestivalCategoryCounts, writeTourSyncLog } from './festivalDbSync.js';
import { fetchXml, redactOpenApiUrl } from './openApiFetch.js';
import { REGION_LABEL, normalizeMetroId } from './metroLocalities.js';
import { municipalSlot } from './metroOpenSources.js';
import {
  applyMunicipalPaging,
  injectServiceKey,
  municipalApiKey,
  municipalAuthNone,
  municipalCultureUrls,
  municipalDefaultSpec,
  regionAddressPrefix,
} from './metroCultureDefaults.js';

function text(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return text(value[0]);
  if (typeof value === 'object') return text(value._ || value.$t || value.text || '');
  return String(value).trim();
}

function pick(row, keys) {
  for (const key of keys) {
    if (row && row[key] != null && text(row[key])) return text(row[key]);
  }
  const lower = {};
  Object.keys(row || {}).forEach((key) => { lower[key.toLowerCase()] = row[key]; });
  for (const key of keys) {
    const hit = lower[String(key).toLowerCase()];
    if (hit != null && text(hit)) return text(hit);
  }
  return '';
}

function kstYmd(ms) {
  const at = Number(ms);
  if (!Number.isFinite(at) || at <= 0) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(at));
  } catch {
    return new Date(at + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }
}

function ymd(raw, yearHint = '') {
  const value = String(raw || '').trim();
  if (!value) return '';
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dotted = value.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (dotted) return `${dotted[1]}-${dotted[2].padStart(2, '0')}-${dotted[3].padStart(2, '0')}`;
  if (yearHint) {
    const md = value.match(/(\d{1,2})\.\s*(\d{1,2})/);
    if (md) return `${yearHint}-${md[1].padStart(2, '0')}-${md[2].padStart(2, '0')}`;
  }
  const digits = value.replace(/\D/g, '');
  if (digits.length === 13) return kstYmd(Number(digits));
  if (digits.length === 10) return kstYmd(Number(digits) * 1000);
  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return '';
}

function periodRange(...raws) {
  for (const raw of raws) {
    const text = String(raw || '').trim();
    if (!text) continue;
    const parts = text.split(/\s*[~～]\s*/);
    const start = ymd(parts[0]);
    const end = ymd(parts[1] || '', start.slice(0, 4)) || start;
    if (start) return { start, end };
  }
  return { start: '', end: '' };
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

export function xmlRecordChunks(xml) {
  const source = String(xml || '');
  const patterns = [/<row[\s>][\s\S]*?<\/row>/gi, /<item[\s>][\s\S]*?<\/item>/gi, /<list[\s>][\s\S]*?<\/list>/gi];
  for (const pattern of patterns) {
    const chunks = source.match(pattern) || [];
    if (chunks.length) return chunks;
  }
  return [];
}

export function xmlRows(xml) {
  return xmlRecordChunks(xml).map((chunk) => {
    const inner = String(chunk)
      .replace(/^<[A-Za-z0-9_]+[^>]*>/, '')
      .replace(/<\/[A-Za-z0-9_]+>\s*$/, '');
    const row = {};
    const tags = inner.matchAll(/<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g);
    for (const match of tags) {
      row[match[1]] = decodeXml(match[2]);
    }
    return row;
  });
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function jsonItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const paths = [
    payload.items,
    payload.data,
    payload.row,
    payload.rows,
    payload.list,
    payload.response?.body?.items?.item,
    payload.response?.body?.items,
    payload.body?.items?.item,
    payload.body?.items,
    payload.body?.data?.list,
    payload.rfcOpenApi?.body?.data?.list,
  ];
  for (const value of paths) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) return [value];
  }
  return [];
}

export function openApiFault(xml) {
  const source = String(xml || '');
  const auth = decodeXml(
    (source.match(/<returnAuthMsg>([\s\S]*?)<\/returnAuthMsg>/i) || [])[1]
    || (source.match(/<errMsg>([\s\S]*?)<\/errMsg>/i) || [])[1]
    || (source.match(/<resultMsg>([\s\S]*?)<\/resultMsg>/i) || [])[1]
    || '',
  );
  const code = decodeXml(
    (source.match(/<returnReasonCode>([\s\S]*?)<\/returnReasonCode>/i) || [])[1]
    || (source.match(/<resultCode>([\s\S]*?)<\/resultCode>/i) || [])[1]
    || '',
  );
  if (/NO_OPENAPI_SERVICE|SERVICE_KEY_IS_NOT_REGISTERED|SERVICE_ACCESS_DENIED|DEADLINE_HAS_EXPIRED|UNKNOWN_ERROR/i.test(source)) {
    return { code: code || 'ERR', message: auth || '공공데이터포털 OpenAPI 오류' };
  }
  if (code && !/^(00|0|NORMAL SERVICE|success)$/i.test(code) && auth && /ERROR|오류|실패|DENIED|INVALID/i.test(`${code} ${auth}`)) {
    return { code, message: auth };
  }
  return null;
}

function withRegionPrefix(address, metro) {
  const prefix = regionAddressPrefix(metro);
  const value = String(address || '').trim();
  if (!prefix) return value;
  if (!value) return prefix;
  if (value.includes(prefix) || value.includes(prefix.replace('광역시', '')) || value.includes(prefix.replace('특별자치시', '')) || value.includes(prefix.replace('특별자치도', '')) || value.includes(prefix.replace('도', ''))) {
    return value;
  }
  return `${prefix} ${value}`;
}

function absoluteImage(raw, metro) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (String(metro || '').toUpperCase() === 'JEJU') {
    return `https://www.jejunolda.com/files/event/${value.replace(/^\/+/, '')}`;
  }
  return value;
}

export function rowsToFestivals(rows, metro) {
  const zone = normalizeMetroId(metro);
  const prefix = zone.slice(0, 3).toLowerCase();
  return (rows || []).map((row, index) => {
    const title = pick(row, [
      'MAIN_TITLE', 'fstvlNm', 'FSTVL_NM', 'nm', 'eventNm', 'EVENT_NM',
      'title', 'TITLE', 'name', 'NAME', 'cntntsSj',
    ]).replace(/\(한\s*,?\s*영[\s\S]*\)$/g, '').trim();
    const period = periodRange(pick(row, ['USAGE_DAY_WEEK_AND_TIME', 'USAGE_DAY']));
    const start = period.start
      || ymd(pick(row, [
        'eventStartDate', 'BEGIN_DE', 'fstvlStartDate', 'FSTVL_BEGIN_DE', 'STRTDATE',
        'startDate', 'start_date', 'eventStartDe', 'opnBgngDt', 'fstvlBgngYmd',
        'bgngYmd', 'op_st_dt', 'start',
      ]))
      || new Date().toISOString().slice(0, 10);
    const end = ymd(pick(row, [
      'eventEndDate', 'END_DE', 'fstvlEndDate', 'FSTVL_END_DE', 'END_DATE',
      'endDate', 'end_date', 'eventEndDe', 'opnEndDt', 'fstvlEndYmd',
      'endYmd', 'op_ed_dt', 'end',
    ])) || period.end || start;
    const street = pick(row, [
      'address', 'rdnmadr', 'lnmadr', 'roadNmAddr', 'lotnoAddr', 'ADDR1', 'addr1', 'ADDR',
      'MAIN_PLACE', 'PLACE', 'place', 'plc', 'place_nm', 'eventPlace', 'FSTVL_PLACE',
      'location', 'adres', 'GUGUN_NM', 'sigungu', 'sig',
    ]);
    const detail = pick(row, ['addr2', 'ADDR2']);
    const address = withRegionPrefix(detail && street && !street.includes(detail) ? `${street} ${detail}` : street, zone);
    const venue = pick(row, ['location', 'MAIN_PLACE', 'place', 'plc', 'place_nm']);
    const contentId = pick(row, [
      'contentId', 'contentid', 'fstvlId', 'id', 'CULTCODE', 'seq',
      'unqId', 'entid', 'res_no', 'UC_SEQ',
    ]) || `${prefix}-${Buffer.from(`${title}|${start}|${index}`).toString('hex').slice(0, 16)}`;
    if (!title) return null;
    return {
      contentId: String(contentId).slice(0, 40),
      title,
      address,
      location_name: venue || address,
      eventStartDate: start,
      eventEndDate: end,
      firstImage: absoluteImage(pick(row, [
        'firstImage', 'IMAGE_URL', 'MAIN_IMG', 'MAIN_IMG_NORMAL', 'imageUrl', 'fstvlCo', 'imgUrl',
        'cover', 'coverThumb',
      ]), zone),
      mapY: Number(pick(row, ['mapY', 'LAT', 'latitude', 'lat', 'la', 'y']) || 0) || undefined,
      mapX: Number(pick(row, ['mapX', 'LOT', 'LNG', 'longitude', 'lng', 'lon', 'lo', 'x']) || 0) || undefined,
      tel: pick(row, ['tel', 'TELNO_INFO', 'phone', 'INQUIRY', 'rprsTelno', 'telno', 'CNTCT_TEL']),
      category: pick(row, ['categoryName', 'category', 'CATEGORY_NM', 'CODENAME', 'realmName', 'dvsn1Nm']) || '문화/예술',
      overview: stripHtml(pick(row, ['overview', 'auspcInstt', 'program', 'eventCn', 'cn', 'contents', 'intr', 'ITEMCNTNTS', 'intro'])),
      metro: zone,
      source: 'muni',
    };
  }).filter(Boolean);
}

export function parseMunicipalPayload(raw) {
  const xml = String(raw || '').replace(/^\uFEFF/, '').trim();
  if (xml.startsWith('{') || xml.startsWith('[')) {
    try {
      const parsed = JSON.parse(xml);
      const rows = jsonItems(parsed);
      const code = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? text(parsed.resultCode) : '';
      const msg = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? text(parsed.resultMsg || parsed.message) : '';
      const fault = code && !/^(00|0|NORMAL SERVICE|success)$/i.test(code)
        ? { code, message: msg || 'OpenAPI 오류' }
        : null;
      return { rows, fault, ok: rows.length > 0 };
    } catch {
      return { rows: [], fault: { code: 'JSON', message: 'JSON 응답을 읽지 못했습니다.' }, ok: false };
    }
  }
  const fault = openApiFault(xml);
  let rows = xmlRows(xml);
  if (!rows.length) {
    try { rows = jsonItems(JSON.parse(xml)); } catch { rows = []; }
  }
  return { rows, fault, ok: rows.length > 0 };
}

function emptyResult(zone, label, targetApi, message) {
  return {
    success: false,
    source: 'muni',
    sourceLabel: label,
    targetApi,
    metro: zone,
    fetched: 0,
    upserted: 0,
    skipped: 0,
    persisted: false,
    failed: 0,
    categories: [],
    ready: false,
    message,
  };
}

export async function fetchMunicipalCulturePage(metro, options = {}) {
  const zone = normalizeMetroId(metro);
  const spec = municipalDefaultSpec(zone);
  const key = municipalApiKey(zone);
  const configured = String(process.env[`${zone}_CULTURE_API_URL`] || process.env[`${zone}_OPENAPI_URL`] || '').trim();
  const urls = municipalCultureUrls(zone, configured);
  const page = Number(options.page || 1);
  const size = Number(options.pageSize || 40);
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = Number(options.timeoutMs || spec?.timeoutMs || 8000);
  let last = { ok: false, rows: [], fault: { code: 'NO_URL', message: `${zone} 문화 OpenAPI URL이 없습니다.` }, url: '' };

  for (const raw of urls) {
    const withKey = municipalAuthNone(zone) ? raw : injectServiceKey(raw, key);
    const url = applyMunicipalPaging(withKey, zone, page, size);
    try {
      const got = await fetchXml(url, fetchImpl, { label: `${zone}_CULTURE`, timeoutMs });
      const parsed = parseMunicipalPayload(got.xml);
      if (parsed.ok) return { ok: true, rows: parsed.rows, url, fault: null };
      last = {
        ok: false,
        rows: [],
        url,
        fault: parsed.fault || { code: String(got.status || 'EMPTY'), message: parsed.fault?.message || `응답에 행이 없습니다. (${redactOpenApiUrl(url)})` },
      };
    } catch (err) {
      last = {
        ok: false,
        rows: [],
        url,
        fault: { code: 'TIMEOUT', message: err && err.message ? err.message : `${zone} 문화 OpenAPI 시간이 초과되었습니다.` },
      };
    }
  }
  return last;
}

export async function syncMunicipalCultureEvents(metro, options = {}) {
  const zone = normalizeMetroId(metro);
  const slot = municipalSlot(zone);
  const targetApi = `${zone}_CULTURE`;
  const spec = municipalDefaultSpec(zone);
  const label = spec?.label ? `${spec.label} OpenAPI` : `${REGION_LABEL[zone] || zone} 지자체 OpenAPI`;
  if (!slot.ready) {
    return emptyResult(zone, label, targetApi, `${slot.urlEnv} 와 ${slot.keyEnv} 를 설정하면 ${label} 수집이 켜집니다.`);
  }
  try {
    const got = await fetchMunicipalCulturePage(zone, options);
    const items = rowsToFestivals(got.rows, zone).slice(0, Number(options.pageSize || 80));
    const persist = await persistTourFestivals(items, { source: 'muni', metro: zone });
    const categories = persist.ok ? await listFestivalCategoryCounts() : [];
    const failMessage = got.fault?.message || '';
    await writeTourSyncLog({
      targetApi,
      fetched: items.length,
      failed: persist.ok || items.length ? 0 : 1,
      status: items.length && persist.ok ? '정상' : items.length ? '부분' : '실패',
      message: persist.message || failMessage,
    });
    return {
      success: items.length > 0,
      source: 'muni',
      sourceLabel: label,
      targetApi,
      metro: zone,
      fetched: items.length,
      upserted: persist.upserted,
      skipped: persist.skipped,
      persisted: persist.ok,
      failed: persist.ok || items.length ? 0 : 1,
      categories,
      ready: true,
      usedUrl: got.url ? redactOpenApiUrl(got.url) : '',
      message: items.length
        ? `${label} ${persist.upserted || items.length}건을 수집했습니다.`
        : failMessage || `${label} 응답에 행이 없습니다.`,
    };
  } catch (err) {
    const message = err && err.message ? err.message : `${label} 수집에 실패했습니다.`;
    console.error('[muni-sync]', zone, message);
    await writeTourSyncLog({ targetApi, fetched: 0, failed: 1, status: '실패', message });
    return {
      ...emptyResult(zone, label, targetApi, message),
      ready: true,
      failed: 1,
    };
  }
}
