/**
 * Express/TypeScript 없이 동작하는 단일 Vercel Function.
 * /api/* rewrite 가 이 파일로 들어오므로 국세청 조회·헬스를 여기서 처리한다.
 */
import {
  checkEmailChallenge,
  generateEmailCode,
  issueEmailChallenge,
  normalizeEmail,
} from './emailChallenge.js';
import {
  dashboard,
  preview,
  recommendCourse,
  sendOfficial,
  settlementCsv,
  updateEngine,
  useCoupon,
  verifyCoupon,
} from './platform.js';
import { METRO_AREA, MOI_CODE_BY_METRO, REGION_LABEL, normalizeMetroId } from './metroLocalities.js';
import {
  applyBusinessCard,
  applyCenterDirector,
  listApplications,
  listCenterLocalities,
  reviewApplication,
  summarizeCenterRegions,
} from './centerDirectors.js';
import {
  approveCenterCourse,
  courseAuth,
  hasCoursePassword,
  listCenterCourses,
  resetCoursePassword,
  reviewCenterCourse,
  upsertCenterCourse,
} from './centerCourses.js';
import { sendResendEmail } from './resendFrom.js';
import {
  getTourDetail2,
  metroRegions,
  searchFestival2,
  searchNearby2,
  toHomeFestival,
  tourServiceKey,
} from './tourLive.js';
import { listPersistedFestivals, persistTourFestivals } from './festivalDbSync.js';
const NTS_STATUS_URL = 'https://api.odcloud.kr/api/nts-businessman/v1/status';
const ACTIVE_CODE = '01';
const ALLOWED_ORIGINS = [
  'https://kdanji.com',
  'https://www.kdanji.com',
  'http://localhost:3000',
  'http://localhost:19006',
];

function send(res, status, body, extraHeaders) {
  const headers = Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extraHeaders || {});
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    Object.keys(headers).forEach((key) => res.setHeader && res.setHeader(key, headers[key]));
    res.status(status).json(body);
    return;
  }
  res.statusCode = status;
  Object.keys(headers).forEach((key) => res.setHeader(key, headers[key]));
  res.end(JSON.stringify(body));
}

function sendCsv(res, req, csv, filename) {
  const value = String(csv || '');
  const body = value.charCodeAt(0) === 0xFEFF ? value : '\uFEFF' + value;
  const month = new Date().toISOString().slice(0, 7);
  const asciiName = 'monthly_settlement_' + month + '.csv';
  const headers = Object.assign(corsHeaders(req), {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="' + asciiName + '"; filename*=UTF-8\'\'' + encodeURIComponent(filename || asciiName),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  if (typeof res.setHeader === 'function') {
    Object.keys(headers).forEach((key) => res.setHeader(key, headers[key]));
  }
  const payload = Buffer.from(body, 'utf8');
  if (typeof res.status === 'function' && typeof res.send === 'function') {
    res.status(200).send(payload);
    return;
  }
  res.statusCode = 200;
  res.end(payload);
}

function originOf(req) {
  const headers = req.headers || {};
  const raw = headers.origin || headers.Origin || '';
  return Array.isArray(raw) ? raw[0] || '' : String(raw);
}

function corsHeaders(req) {
  const origin = originOf(req);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };
  if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  return headers;
}

function readBody(req) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_err) {
      return {};
    }
  }
  if (typeof raw === 'object') return raw;
  return {};
}

function readQuery(req) {
  const raw = requestPath(req);
  const q = raw.indexOf('?');
  if (q < 0) return {};
  try {
    return Object.fromEntries(new URLSearchParams(raw.slice(q + 1)));
  } catch (_err) {
    return {};
  }
}

function requestPath(req) {
  const headers = req.headers || {};
  const pick = (value) => (Array.isArray(value) ? value[0] : value) || '';
  return [
    req.url,
    req.originalUrl,
    pick(headers['x-invoke-path']),
    pick(headers['x-matched-path']),
    pick(headers['x-forwarded-uri']),
    pick(headers['x-vercel-original-url']),
  ].filter(Boolean).join(' ');
}

function normalizeBusinessNumber(raw) {
  return String(raw || '').replace(/\D/g, '');
}

function rejectionMessage(status) {
  if (status.b_stt_cd === '02') return '휴업 중인 사업자는 할인 프로모션을 등록할 수 없습니다.';
  if (status.b_stt_cd === '03') {
    const closed = status.end_dt ? ' (폐업일 ' + status.end_dt + ')' : '';
    return '폐업한 사업자는 할인 프로모션을 등록할 수 없습니다.' + closed;
  }
  if (status.tax_type) return status.tax_type;
  return '국세청 사업자 상태가 계속사업자(01)가 아니므로 프로모션을 등록할 수 없습니다.';
}

async function verifyNts(req, res) {
  const headers = corsHeaders(req);
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }

  const body = readBody(req);
  const businessName = typeof body.business_name === 'string' ? body.business_name.trim() : '';
  const businessNumber = normalizeBusinessNumber(body.business_number);

  if (!/^\d{10}$/.test(businessNumber)) {
    send(res, 400, { success: false, message: '사업자등록번호는 숫자 10자리여야 합니다.' }, headers);
    return;
  }

  const serviceKey = String(process.env.NTS_SERVICE_KEY || '').trim();
  if (!serviceKey) {
    send(res, 500, {
      success: false,
      message: '국세청 API 인증키(NTS_SERVICE_KEY)가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.',
    }, headers);
    return;
  }

  const url = NTS_STATUS_URL + '?serviceKey=' + encodeURIComponent(serviceKey) + '&returnType=JSON';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ b_no: [businessNumber] }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_err) {
    payload = null;
  }

  if (!response.ok) {
    const authFail = response.status === 401 || response.status === 403;
    send(res, authFail ? response.status : 502, {
      success: false,
      message: authFail
        ? '국세청 API 인증키(NTS_SERVICE_KEY)가 유효하지 않습니다. Vercel 환경변수를 확인하세요.'
        : '국세청 사업자 상태조회가 실패했습니다. (HTTP ' + response.status + ')',
    }, headers);
    return;
  }

  const row = payload && payload.data && payload.data[0];
  if (!row) {
    send(res, 404, { success: false, message: '국세청에 등록되지 않은 사업자등록번호입니다.' }, headers);
    return;
  }

  const status = {
    b_no: row.b_no || businessNumber,
    b_stt: row.b_stt || '',
    b_stt_cd: row.b_stt_cd || '',
    tax_type: row.tax_type || '',
    tax_type_cd: row.tax_type_cd || '',
    end_dt: row.end_dt || '',
  };
  const verified = status.b_stt_cd === ACTIVE_CODE;
  send(res, verified ? 200 : 409, {
    success: verified,
    message: verified
      ? '국세청 계속사업자로 확인되었습니다. 상가 자체 할인은 바로 등록할 수 있습니다.'
      : rejectionMessage(status),
    data: {
      verified: verified,
      business_name: businessName || null,
      business_number: status.b_no,
      b_stt: status.b_stt,
      b_stt_cd: status.b_stt_cd,
      tax_type: status.tax_type,
      tax_type_cd: status.tax_type_cd,
      end_dt: status.end_dt || null,
    },
  }, headers);
}

const emailCodes = new Map();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function resendConfigured() {
  return Boolean(String(process.env.RESEND_API_KEY || '').trim());
}

function homeFromTour(item, metro, areaCode) {
  return toHomeFestival({
    contentid: item.contentId,
    contenttypeid: item.contentTypeId,
    title: item.title,
    addr1: item.address,
    eventstartdate: item.eventStartDate,
    eventenddate: item.eventEndDate,
    firstimage: item.firstImage,
    mapx: item.mapX,
    mapy: item.mapY,
    tel: item.tel,
    overview: item.overview,
    areacode: item.areaCode || areaCode,
  }, metro, areaCode);
}

async function listFestivalsLive(req, res) {
  const headers = corsHeaders(req);
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }
  const query = readQuery(req);
  const metroKey = normalizeMetroId(query.metro);
  try {
    const result = await searchFestival2({
      metro: metroKey,
      areaCode: query.areaCode || METRO_AREA[metroKey],
      month: query.month,
      year: query.year,
      category: query.category,
    });
    let festivals = result.festivals.map((item) => homeFromTour(item, result.metro, result.areaCode)).filter(Boolean);
    let source = result.source;
    if (!festivals.length) {
      const persisted = await listPersistedFestivals(result.metro);
      if (persisted.length) {
        festivals = persisted;
        source = 'db';
      }
    }
    send(res, 200, {
      success: true,
      metro: result.metro,
      regionalZone: result.metro,
      areaCode: result.areaCode,
      moiCode: MOI_CODE_BY_METRO[result.metro] || result.lDongRegnCd,
      regionLabel: result.regionLabel,
      count: festivals.length,
      source: source,
      festivals: festivals,
      data: festivals,
      message: festivals.length ? '권역 축제 목록' : 'TourAPI 목록이 비어 있습니다.',
    }, headers);
  } catch (err) {
    console.error('[api] searchFestival2', err && err.message ? err.message : err);
    const persisted = await listPersistedFestivals(metroKey).catch(() => []);
    send(res, 200, {
      success: true,
      metro: metroKey,
      regionalZone: metroKey,
      areaCode: METRO_AREA[metroKey] || '31',
      moiCode: MOI_CODE_BY_METRO[metroKey] || '41',
      regionLabel: REGION_LABEL[metroKey] || '경기온',
      count: persisted.length,
      source: persisted.length ? 'db' : 'none',
      festivals: persisted,
      data: persisted,
      message: persisted.length ? '저장된 TourAPI 축제 목록' : 'TourAPI 목록이 비어 있습니다.',
    }, headers);
  }
}

async function syncFestivalsLive(req, res) {
  const headers = corsHeaders(req);
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }
  const query = readQuery(req);
  const metroKey = normalizeMetroId(query.metro);
  try {
    const result = await searchFestival2({
      metro: metroKey,
      areaCode: query.areaCode || METRO_AREA[metroKey],
      month: query.month,
      year: query.year,
      category: query.category,
    });
    const festivals = result.festivals.map((item) => homeFromTour(item, result.metro, result.areaCode)).filter(Boolean);
    const persist = await persistTourFestivals(result.festivals);
    send(res, 200, {
      success: true,
      metro: result.metro,
      regionalZone: result.metro,
      areaCode: result.areaCode,
      moiCode: MOI_CODE_BY_METRO[result.metro] || result.lDongRegnCd,
      regionLabel: result.regionLabel,
      count: festivals.length,
      fetched: festivals.length,
      upserted: persist.upserted,
      skipped: persist.skipped,
      persisted: persist.ok,
      source: result.source,
      festivals: festivals,
      data: festivals,
      message: persist.ok
        ? result.regionLabel + ' 축제 ' + persist.upserted + '건을 DB에 동기화했습니다. (' + result.source + ')'
        : result.regionLabel + ' 축제 ' + festivals.length + '건을 TourAPI에서 수집했습니다. ' + persist.message,
    }, headers);
  } catch (err) {
    console.error('[api] festival sync', err && err.message ? err.message : err);
    send(res, 502, {
      success: false,
      metro: metroKey,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      persisted: false,
      source: 'none',
      festivals: [],
      data: [],
      message: err && err.message ? err.message : '축제 동기화에 실패했습니다.',
    }, headers);
  }
}

async function listTourFestivals(req, res) {
  const headers = corsHeaders(req);
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }
  const query = readQuery(req);
  try {
    const result = await searchFestival2({
      areaCode: query.areaCode || 'all',
      metro: query.metro,
      month: query.month,
      year: query.year,
      category: query.category,
    });
    send(res, 200, {
      success: true,
      areaCode: query.areaCode || 'all',
      month: result.month,
      year: result.year,
      count: result.festivals.length,
      source: result.source,
      data: result.festivals,
    }, headers);
  } catch (err) {
    send(res, 502, {
      success: false,
      message: err && err.message ? err.message : 'TourAPI 축제 조회에 실패했습니다.',
    }, headers);
  }
}

async function listTourNearby(req, res) {
  const headers = corsHeaders(req);
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }
  const query = readQuery(req);
  const mapX = Number(query.mapX || query.lng);
  const mapY = Number(query.mapY || query.lat);
  if (!Number.isFinite(mapX) || !Number.isFinite(mapY)) {
    send(res, 400, { success: false, message: 'mapX(경도), mapY(위도)가 필요합니다.' }, headers);
    return;
  }
  try {
    const places = await searchNearby2({
      mapX: mapX,
      mapY: mapY,
      radius: Number(query.radius) || 3000,
      contentTypeId: query.contentTypeId,
    });
    send(res, 200, {
      success: true,
      mapX: mapX,
      mapY: mapY,
      radius: Number(query.radius) || 3000,
      count: places.length,
      data: places,
    }, headers);
  } catch (err) {
    send(res, 502, {
      success: false,
      message: err && err.message ? err.message : '주변 관광 조회에 실패했습니다.',
    }, headers);
  }
}

async function getTourDetail(req, res, contentId) {
  const headers = corsHeaders(req);
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }
  const query = readQuery(req);
  try {
    const detail = await getTourDetail2(contentId, query.contentTypeId);
    send(res, 200, { success: true, data: detail }, headers);
  } catch (err) {
    send(res, 502, {
      success: false,
      message: err && err.message ? err.message : '관광 상세 조회에 실패했습니다.',
    }, headers);
  }
}

async function getHomeFeed(req, res) {
  const headers = corsHeaders(req);
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }
  const query = readQuery(req);
  const metro = normalizeMetroId(query.metro);
  try {
    const now = new Date();
    const result = await searchFestival2({
      metro: metro,
      areaCode: METRO_AREA[metro],
      month: query.month || (now.getMonth() + 1),
      year: query.year || now.getFullYear(),
      category: query.category,
    });
    let festivals = result.festivals.map((item) => homeFromTour(item, result.metro, result.areaCode)).filter(Boolean);
    let source = result.source;
    if (!festivals.length) {
      const persisted = await listPersistedFestivals(metro);
      if (persisted.length) {
        festivals = persisted;
        source = 'db';
      }
    }
    send(res, 200, {
      success: true,
      available: festivals.length > 0,
      metro: metro,
      regionalZone: metro,
      regions: metroRegions(),
      festivals: festivals.map((item) => Object.assign({}, item, { hasCoupon: Boolean(item && item.hasCoupon) })),
      promotions: [],
      popular: festivals.map((item) => Object.assign({}, item, { hasCoupon: Boolean(item && item.hasCoupon) })),
      source: source,
    }, headers);
  } catch (err) {
    console.error('[api] /api/home', err && err.message ? err.message : err);
    const persisted = await listPersistedFestivals(metro).catch(() => []);
    send(res, 200, {
      success: true,
      available: persisted.length > 0,
      metro: metro,
      regionalZone: metro,
      regions: metroRegions(),
      festivals: persisted,
      promotions: [],
      popular: persisted,
      source: persisted.length ? 'db' : 'none',
      message: persisted.length ? '저장된 TourAPI 축제 목록' : 'TourAPI 목록이 비어 있습니다.',
    }, headers);
  }
}

async function sendEmailCode(req, res) {
  const headers = corsHeaders(req);
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }
  const body = readBody(req);
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!isValidEmail(email)) {
    send(res, 400, { success: false, message: '담당자 메일 형식을 확인해주세요.' }, headers);
    return;
  }
  const code = generateEmailCode();
  const issued = issueEmailChallenge(email, code);
  emailCodes.set(normalizeEmail(email), { code: code, expiresAt: issued.expiresAt, challenge: issued.challenge });
  const key = String(process.env.RESEND_API_KEY || '').trim();
  if (key) {
    const sent = await sendResendEmail({
      key: key,
      to: email,
      subject: '[온앤온+] 지자체 담당자 인증번호',
      html: '<p>온앤온+ 지자체 담당자 인증번호는 <strong>' + code + '</strong> 입니다. 3분 안에 입력해 주세요.</p>',
    });
    if (!sent.ok) {
      send(res, 502, { success: false, message: sent.message }, headers);
      return;
    }
    send(res, 200, {
      success: true,
      message: email + '으로 인증번호를 보냈습니다. 메일함을 확인한 뒤 3분 안에 입력해주세요.',
      challenge: issued.challenge,
    }, headers);
    return;
  }
  console.log('[api] email code', email, code);
  send(res, 200, {
    success: true,
    message: '메일 서버 키(RESEND_API_KEY)가 없어 메일은 나가지 않았습니다. 화면에 표시된 개발용 코드를 입력하세요.',
    devCode: code,
    challenge: issued.challenge,
  }, headers);
}

async function verifyEmailCode(req, res) {
  const headers = corsHeaders(req);
  if (String(req.method || '').toUpperCase() === 'OPTIONS') {
    send(res, 204, {}, headers);
    return;
  }
  const body = readBody(req);
  const email = normalizeEmail(body.email);
  const code = String(body.code || '').trim();
  const challenge = typeof body.challenge === 'string' ? body.challenge : '';
  const signed = checkEmailChallenge(email, code, challenge);
  const record = emailCodes.get(email);
  const memoryOk = record
    && record.expiresAt >= Date.now()
    && record.code === code;
  if (!signed.ok && !memoryOk) {
    send(res, 400, {
      success: false,
      message: signed.reason || (record ? '인증번호가 일치하지 않습니다.' : '인증번호를 먼저 받아주세요.'),
    }, headers);
    return;
  }
  emailCodes.delete(email);
  send(res, 200, { success: true, message: '담당자 메일이 확인되었습니다.', email: email }, headers);
}

function cronAuthorized(req) {
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret) return true;
  return String(req.headers.authorization || '') === 'Bearer ' + secret;
}

async function handler(req, res) {
  try {
    const method = String(req.method || 'GET').toUpperCase();
    const path = requestPath(req);
    const body = readBody(req);

    if (/coupons\/verify/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const result = verifyCoupon(body.code || body.coupon_code);
      send(res, result.status, result.body, corsHeaders(req));
      return;
    }
    if (/coupons\/use/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const result = useCoupon(body.code || body.coupon_code, body.merchant_id);
      send(res, result.status, result.body, corsHeaders(req));
      return;
    }
    if (/settlements\/preview/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const query = readQuery(req);
      const merchantId = body.merchant_id || query.merchant_id;
      send(res, 200, { success: true, data: preview(merchantId) }, corsHeaders(req));
      return;
    }
    if (/settlements\/send/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const result = await sendOfficial(body.merchant_id, body.to_email);
      send(res, result.status, result.body, corsHeaders(req));
      return;
    }
    if (/courses\/recommend/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const query = readQuery(req);
      const title = body.title || query.title || '';
      const city = body.city || query.city || '';
      send(res, 200, {
        success: true,
        data: recommendCourse(title, city, {
          address: body.address || query.address || '',
          metro: body.metro || query.metro || '',
          latitude: Number(body.latitude || query.lat || query.latitude),
          longitude: Number(body.longitude || query.lng || query.longitude),
          contentTypeId: body.contentTypeId || query.contentTypeId || '',
          kind: body.kind || query.kind || '',
          category: body.category || query.category || '',
        }),
      }, corsHeaders(req));
      return;
    }
    if (/centers\/apply/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const result = applyCenterDirector(body);
      send(res, result.ok ? 200 : 400, {
        success: result.ok,
        data: result.data,
        message: result.ok ? '지원이 접수되었습니다. 관리자가 선정 심사를 진행합니다.' : result.message,
      }, corsHeaders(req));
      return;
    }
    const centerCard = path.match(/\/api\/centers\/applications\/([^/?\s]+)\/card/i);
    if (centerCard) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const result = applyBusinessCard(decodeURIComponent(centerCard[1]));
      send(res, result.ok ? 200 : 404, {
        success: result.ok,
        data: result.data,
        message: result.ok ? '명함에 지원서 정보를 적용했습니다.' : result.message,
      }, corsHeaders(req));
      return;
    }
    const centerReview = path.match(/\/api\/centers\/applications\/([^/?\s]+)/i);
    if (centerReview) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const result = reviewApplication(decodeURIComponent(centerReview[1]), body.status);
      send(res, result.ok ? 200 : 404, { success: result.ok, data: result.data, message: result.message }, corsHeaders(req));
      return;
    }
    if (/\/api\/centers\/applications/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      send(res, 200, { success: true, data: listApplications() }, corsHeaders(req));
      return;
    }
    const courseReview = path.match(/\/api\/centers\/courses\/([^/?\s]+)\/review/i);
    if (courseReview) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const result = reviewCenterCourse(decodeURIComponent(courseReview[1]), body.status);
      send(res, result.ok ? 200 : 400, {
        success: result.ok,
        data: result.data,
        message: result.ok ? '코스 검토 상태를 저장했습니다.' : result.message,
      }, corsHeaders(req));
      return;
    }
    const courseApprove = path.match(/\/api\/centers\/courses\/([^/?\s]+)\/approve/i);
    if (courseApprove) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const result = approveCenterCourse(decodeURIComponent(courseApprove[1]));
      send(res, result.ok ? 200 : 404, {
        success: result.ok,
        data: result.data,
        message: result.ok ? '승인되어 앱에 등재되었습니다.' : result.message,
      }, corsHeaders(req));
      return;
    }
    if (/\/api\/centers\/course-auth\/reset/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const result = resetCoursePassword(body.centerId || readQuery(req).centerId);
      send(res, result.ok ? 200 : 400, {
        success: result.ok,
        hasPassword: false,
        message: result.ok ? '해당 지역 코스 비밀번호를 초기화했습니다.' : result.message,
      }, corsHeaders(req));
      return;
    }
    if (/\/api\/centers\/course-auth/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      if (method === 'GET') {
        const query = readQuery(req);
        send(res, 200, { success: true, hasPassword: hasCoursePassword(query.centerId) }, corsHeaders(req));
        return;
      }
      const result = courseAuth(body);
      send(res, result.ok ? 200 : 400, {
        success: result.ok,
        hasPassword: result.ok ? result.hasPassword : hasCoursePassword(body.centerId),
        message: result.ok ? '확인되었습니다.' : result.message,
      }, corsHeaders(req));
      return;
    }
    if (/\/api\/centers\/courses/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const query = readQuery(req);
      const review = query.review === '1' || query.review === 'true';
      if (method === 'POST') {
        const result = upsertCenterCourse(body);
        send(res, result.ok ? 200 : 400, {
          success: result.ok,
          data: result.data,
          message: result.ok ? '추천 코스 검토 요청이 접수되었습니다.' : result.message,
        }, corsHeaders(req));
        return;
      }
      send(res, 200, {
        success: true,
        data: listCenterCourses(query.regionId || query.region || query.city, query.metro, review),
      }, corsHeaders(req));
      return;
    }
    const centerRegion = path.match(/\/api\/centers\/([^/?\s]+)/i);
    if (centerRegion) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      send(res, 200, { success: true, data: listCenterLocalities(decodeURIComponent(centerRegion[1])) }, corsHeaders(req));
      return;
    }
    if (/\/api\/centers/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      send(res, 200, { success: true, data: summarizeCenterRegions() }, corsHeaders(req));
      return;
    }
    if (/admin\/dashboard/i.test(path)) {
      send(res, 200, { success: true, data: dashboard() }, corsHeaders(req));
      return;
    }
    if (/admin\/engine/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      send(res, 200, { success: true, data: updateEngine(body) }, corsHeaders(req));
      return;
    }
    if (/admin\/settlement\/excel|admin\/settlements?\.csv/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      sendCsv(res, req, settlementCsv(), '월별정산내역_' + new Date().toISOString().slice(0, 7) + '.csv');
      return;
    }
    if (/admin\/login/i.test(path)) {
      if (method === 'OPTIONS') { send(res, 204, {}, corsHeaders(req)); return; }
      const email = String(body.email || '').trim();
      const password = String(body.password || '');
      if (email === 'admin@gyeonggi-on.kr' && password === 'admin1234') {
        send(res, 200, { success: true, data: { token: 'admin-local' }, message: '관리자 로그인' }, corsHeaders(req));
        return;
      }
      send(res, 401, { success: false, message: '관리자 계정 정보가 올바르지 않습니다.' }, corsHeaders(req));
      return;
    }

    if (/auth\/send-email-code/i.test(path)) {
      await sendEmailCode(req, res);
      return;
    }
    if (/auth\/verify-email-code/i.test(path)) {
      await verifyEmailCode(req, res);
      return;
    }
    if (/\/api\/home/i.test(path)) {
      await getHomeFeed(req, res);
      return;
    }
    if (/\/api\/tour\/festivals/i.test(path)) {
      await listTourFestivals(req, res);
      return;
    }
    if (/\/api\/tour\/nearby/i.test(path)) {
      await listTourNearby(req, res);
      return;
    }
    const tourDetail = path.match(/\/api\/tour\/detail\/([^/?\s]+)/i);
    if (tourDetail) {
      await getTourDetail(req, res, decodeURIComponent(tourDetail[1]));
      return;
    }
    if (/\/api\/festivals\/?(\?|$)/i.test(path) || /\/api\/festivals["\s]/i.test(path) || /(^|[^\w])\/api\/festivals([^\w]|$)/i.test(path)) {
      if (!/festivals\/(nearby|sync|[^/]+\/map)/i.test(path)) {
        await listFestivalsLive(req, res);
        return;
      }
    }
    if (/cron\/festivals|festivals\/sync/i.test(path)) {
      const isCron = /cron\/festivals/i.test(path);
      if (isCron && !cronAuthorized(req)) {
        send(res, 401, { success: false, message: 'cron 인증이 필요합니다.' }, corsHeaders(req));
        return;
      }
      await syncFestivalsLive(req, res);
      return;
    }

    const looksVerify = /merchants\/verify/i.test(path)
      || (method === 'POST' && typeof body.business_number === 'string');
    if (looksVerify || (method === 'OPTIONS' && /merchants\/verify/i.test(path))) {
      await verifyNts(req, res);
      return;
    }

    if (/\/health|\/api\/health/i.test(path) || /(^|\s)\/api\/?(\?|$)/.test(path)) {
      send(res, 200, {
        status: 'ok',
        service: 'gyeonggi-on-api',
        nts: Boolean(String(process.env.NTS_SERVICE_KEY || '').trim()),
        email: resendConfigured(),
        tour: Boolean(tourServiceKey()),
      }, corsHeaders(req));
      return;
    }

    send(res, 404, { success: false, message: '지원하지 않는 API입니다.' }, corsHeaders(req));
  } catch (err) {
    send(res, 500, {
      success: false,
      message: err && err.message ? err.message : '요청 처리에 실패했습니다.',
    }, corsHeaders(req));
  }
}

export default handler;
