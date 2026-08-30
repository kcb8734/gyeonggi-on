/** 공공 OpenAPI 호출. 키는 로그에 남기지 않는다. */

export function redactOpenApiUrl(url) {
  return String(url || '')
    .replace(/([?&]KEY=)[^&]+/i, '$1***')
    .replace(/:\/\/[^/]+\/([A-Za-z0-9]{16,})\//, '://$HOST/***/');
}

export async function fetchXml(url, fetchImpl = fetch, options = {}) {
  const label = options.label || 'openapi';
  const timeoutMs = Number(options.timeoutMs || 7000);
  const started = Date.now();
  const safeUrl = redactOpenApiUrl(url);
  try {
    const res = await fetchImpl(url, {
      headers: { Accept: 'application/xml,text/xml,*/*' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const xml = await res.text();
    console.log(`[${label}] status=${res.status} bytes=${xml.length} ms=${Date.now() - started} url=${safeUrl}`);
    if (!res.ok) {
      console.error(`[${label}] HTTP ${res.status}`, {
        url: safeUrl,
        preview: String(xml || '').slice(0, 180),
        ms: Date.now() - started,
      });
    }
    return { ok: res.ok, status: res.status, xml };
  } catch (err) {
    console.error(`[${label}] fetch failed`, {
      url: safeUrl,
      ms: Date.now() - started,
      name: err && err.name,
      message: err && err.message ? err.message : String(err),
    });
    throw err;
  }
}
