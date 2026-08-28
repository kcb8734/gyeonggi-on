export function withUtf8Bom(text: string) {
  const value = String(text ?? '');
  if (!value) return '\uFEFF';
  return value.charCodeAt(0) === 0xFEFF ? value : `\uFEFF${value}`;
}

export function extractCsvPayload(raw: string) {
  const value = String(raw ?? '');
  const trimmed = value.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return '';
  if (/^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return '';
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.csv === 'string') return parsed.csv;
    } catch {
      // JSON이 아니면 원문을 CSV로 쓴다.
    }
  }
  return value;
}

export function looksLikeCsv(value: string) {
  const trimmed = String(value || '').replace(/^\uFEFF/, '').trim();
  if (!trimmed) return false;
  if (/^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return false;
  return trimmed.includes(',') || trimmed.includes('\n');
}

export function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function settlementFilename(now = new Date()) {
  return `월별정산내역_${now.toISOString().slice(0, 7)}.csv`;
}

export function matchingToCsv(rows: Array<Record<string, unknown>> = []) {
  const header = '권역,시군,담당자,매칭상가,활성축제,쿠폰,승인';
  const body = rows.map((row) => [
    csvEscape(row.regionLabel || row.region || ''),
    csvEscape(row.city),
    csvEscape(row.officerName || '미지정'),
    csvEscape(row.stores),
    csvEscape(row.festivals),
    csvEscape(row.coupons),
    row.approved ? '승인' : '대기',
  ].join(','));
  return [header, ...body].join('\n');
}

export function couponMasterToCsv(rows: Array<Record<string, unknown>> = []) {
  const header = '쿠폰코드,축제,상가,발급,사용,회수율,기간,권역,유형';
  const body = rows.map((row) => [
    csvEscape(row.id || row.code),
    csvEscape(row.festival),
    csvEscape(row.store || row.business_name),
    csvEscape(row.issued ?? row.couponsIssued),
    csvEscape(row.used ?? row.couponsUsed),
    csvEscape(row.recovery),
    csvEscape(row.period),
    csvEscape(row.region),
    csvEscape(row.couponType || row.coupon_type),
  ].join(','));
  return [header, ...body].join('\n');
}

export function adminExcelCsv(input: {
  coupons?: Array<Record<string, unknown>>;
  matching?: Array<Record<string, unknown>>;
}) {
  const parts = [
    couponMasterToCsv(input.coupons || []),
    matchingToCsv(input.matching || []),
  ].filter((part) => part.split('\n').length > 1);
  return parts.join('\n\n') || matchingToCsv([]);
}

export function triggerCsvDownload(filename: string, csvContent: string) {
  const csv = withUtf8Bom(extractCsvPayload(csvContent) || csvContent);
  if (typeof document !== 'undefined' && document.body) {
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = typeof URL !== 'undefined' && URL.createObjectURL
        ? URL.createObjectURL(blob)
        : `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (url.startsWith('blob:') && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(url);
      }
      return;
    } catch {
      const link = document.createElement('a');
      link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
  }
  throw new Error('브라우저에서만 내려받을 수 있습니다.');
}

export async function fetchSettlementCsv(urls: string[]) {
  let lastError: unknown;
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { Accept: 'text/csv, application/json' } });
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }
      const csv = extractCsvPayload(await response.text());
      if (looksLikeCsv(csv)) return csv;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  throw new Error('정산 CSV가 비어 있습니다.');
}
