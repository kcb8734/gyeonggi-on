/**
 * 국세청 사업자등록 상태조회 — Express 앱을 불러오지 않는 단독 Vercel Function.
 * /api/merchants/verify 가 api/index.ts(Express) 크래시에 묶이지 않도록 분리한다.
 */

const NTS_STATUS_URL = 'https://api.odcloud.kr/api/nts-businessman/v1/status';
const ACTIVE_CODE = '01';
const ALLOWED_ORIGINS = [
  'https://kdanji.com',
  'https://www.kdanji.com',
  'http://localhost:3000',
  'http://localhost:19006',
];

type Req = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type Res = {
  setHeader: (key: string, value: string) => void;
  status: (code: number) => Res;
  json: (body: unknown) => void;
  end: () => void;
};

function applyCors(req: Req, res: Res) {
  const origin = String(req.headers?.origin ?? '');
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
}

function readBody(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return {};
}

function normalizeBusinessNumber(raw: string): string {
  return String(raw ?? '').replace(/\D/g, '');
}

function rejectionMessage(status: { b_stt_cd: string; tax_type: string; end_dt: string }): string {
  if (status.b_stt_cd === '02') return '휴업 중인 사업자는 할인 프로모션을 등록할 수 없습니다.';
  if (status.b_stt_cd === '03') {
    const closed = status.end_dt ? ` (폐업일 ${status.end_dt})` : '';
    return `폐업한 사업자는 할인 프로모션을 등록할 수 없습니다.${closed}`;
  }
  if (status.tax_type) return status.tax_type;
  return '국세청 사업자 상태가 계속사업자(01)가 아니므로 프로모션을 등록할 수 없습니다.';
}

export default async function handler(req: Req, res: Res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'POST만 지원합니다.' });
    return;
  }

  const body = readBody(req.body);
  const businessName = typeof body.business_name === 'string' ? body.business_name.trim() : '';
  const businessNumber = normalizeBusinessNumber(String(body.business_number ?? ''));

  if (!businessNumber) {
    res.status(400).json({ success: false, message: '사업자등록번호 또는 merchant_id가 필요합니다.' });
    return;
  }
  if (!/^\d{10}$/.test(businessNumber)) {
    res.status(400).json({ success: false, message: '사업자등록번호는 숫자 10자리여야 합니다.' });
    return;
  }

  const serviceKey = String(process.env.NTS_SERVICE_KEY ?? '').trim();
  if (!serviceKey) {
    res.status(500).json({
      success: false,
      message: '국세청 API 인증키(NTS_SERVICE_KEY)가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.',
    });
    return;
  }

  const url = `${NTS_STATUS_URL}?serviceKey=${encodeURIComponent(serviceKey)}&returnType=JSON`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ b_no: [businessNumber] }),
      signal: controller.signal,
    });

    let payload: {
      status_code?: string;
      data?: Array<{
        b_no?: string;
        b_stt?: string;
        b_stt_cd?: string;
        tax_type?: string;
        tax_type_cd?: string;
        end_dt?: string;
      }>;
      msg?: string;
      message?: string;
    } | null = null;
    try {
      payload = await response.json() as typeof payload;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const detail = payload?.msg || payload?.message || payload?.status_code;
      const authFail = response.status === 401 || response.status === 403;
      res.status(authFail ? response.status : 502).json({
        success: false,
        message: authFail
          ? '국세청 API 인증키(NTS_SERVICE_KEY)가 유효하지 않습니다. Vercel 환경변수를 확인하세요.'
          : `국세청 사업자 상태조회가 실패했습니다.${detail ? ` (${detail})` : ` (HTTP ${response.status})`}`,
      });
      return;
    }

    if (payload?.status_code && payload.status_code !== 'OK') {
      res.status(502).json({
        success: false,
        message: `국세청 사업자 상태조회가 실패했습니다. (${payload.status_code})`,
      });
      return;
    }

    const row = payload?.data?.[0];
    if (!row) {
      res.status(404).json({ success: false, message: '국세청에 등록되지 않은 사업자등록번호입니다.' });
      return;
    }

    const status = {
      b_no: row.b_no ?? businessNumber,
      b_stt: row.b_stt ?? '',
      b_stt_cd: row.b_stt_cd ?? '',
      tax_type: row.tax_type ?? '',
      tax_type_cd: row.tax_type_cd ?? '',
      end_dt: row.end_dt ?? '',
    };
    const verified = status.b_stt_cd === ACTIVE_CODE;

    res.status(verified ? 200 : 409).json({
      success: verified,
      message: verified
        ? '국세청 계속사업자로 확인되었습니다. 상가 자체 할인은 바로 등록할 수 있습니다.'
        : rejectionMessage(status),
      data: {
        verified,
        business_name: businessName || null,
        business_number: status.b_no,
        b_stt: status.b_stt,
        b_stt_cd: status.b_stt_cd,
        tax_type: status.tax_type,
        tax_type_cd: status.tax_type_cd,
        end_dt: status.end_dt || null,
      },
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError';
    res.status(timedOut ? 504 : 502).json({
      success: false,
      message: timedOut
        ? '국세청 사업자 상태조회 요청이 시간 초과되었습니다.'
        : '국세청 사업자 상태조회 서비스에 연결하지 못했습니다.',
    });
  } finally {
    clearTimeout(timer);
  }
}
