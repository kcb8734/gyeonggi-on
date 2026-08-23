/**
 * Vercel은 `/api/(.*)` 를 이 파일로 보낸다.
 * Express(backend/src/app)를 여기서 import 하면 pg/express 해석 실패로
 * FUNCTION_INVOCATION_FAILED 가 나고, 국세청 조회·헬스까지 같이 죽는다.
 * 국세청 확인과 헬스는 Express 없이 처리한다.
 */
import verifyMerchant from './merchants/verify';
import health from './health';

type Req = {
  method?: string;
  url?: string;
  originalUrl?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type Res = {
  setHeader: (key: string, value: string) => void;
  status: (code: number) => Res;
  json: (body: unknown) => void;
  end: () => void;
};

function header(req: Req, name: string): string {
  const raw = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? '';
  return typeof raw === 'string' ? raw : '';
}

function requestPath(req: Req): string {
  return [
    req.url,
    req.originalUrl,
    header(req, 'x-invoke-path'),
    header(req, 'x-matched-path'),
    header(req, 'x-forwarded-uri'),
    header(req, 'x-vercel-original-url'),
  ].filter(Boolean).join(' ');
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

export default async function handler(req: Req, res: Res) {
  const method = String(req.method || 'GET').toUpperCase();
  const path = requestPath(req);
  const body = readBody(req.body);

  if (method === 'OPTIONS') {
    return verifyMerchant(req, res);
  }

  const looksVerify =
    /merchants\/verify/i.test(path)
    || (method === 'POST' && typeof body.business_number === 'string');

  if (looksVerify) {
    return verifyMerchant(req, res);
  }

  if (/health/i.test(path) || method === 'GET') {
    return health(req, res);
  }

  res.status(405).json({ success: false, message: '지원하지 않는 API 경로입니다.' });
}
