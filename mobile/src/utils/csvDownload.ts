export function withUtf8Bom(text: string) {
  const value = String(text ?? '');
  if (!value) return '\uFEFF';
  return value.charCodeAt(0) === 0xFEFF ? value : `\uFEFF${value}`;
}

export function extractCsvPayload(raw: string) {
  const value = String(raw ?? '');
  const trimmed = value.replace(/^\uFEFF/, '').trim();
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

export function settlementFilename(now = new Date()) {
  return `월별정산내역_${now.toISOString().slice(0, 7)}.csv`;
}

export function triggerCsvDownload(filename: string, csvContent: string) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('브라우저에서만 내려받을 수 있습니다.');
  }
  const blob = new Blob([withUtf8Bom(extractCsvPayload(csvContent))], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
      if (csv.replace(/^\uFEFF/, '').trim()) return csv;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  throw new Error('정산 CSV가 비어 있습니다.');
}
