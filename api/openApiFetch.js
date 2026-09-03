export function logOpenApiEmpty(label, info = {}) {
  console.error(`[${label}] empty-or-error`, {
    code: info.code || '',
    message: info.message || '',
    hasKey: Boolean(info.hasKey),
    httpStatus: info.httpStatus ?? null,
    xmlBytes: Number(info.xmlBytes || 0),
    parsedRows: Number(info.parsedRows || 0),
    mappedRows: info.mappedRows,
    preview: String(info.preview || '').replace(/\s+/g, ' ').slice(0, 180),
  });
}

export function redactOpenApiUrl(url) {
  return String(url || '')
    .replace(/([?&](?:apiKey|KEY|serviceKey)=)[^&]+/gi, '$1***')
    .replace(/:\/\/[^/]+\/([A-Za-z0-9]{16,})\//, '://$HOST/***/');
}

export async function fetchXml(url, fetchImpl = fetch, options = {}) {
  const label = options.label || 'openapi';
  const timeoutMs = Number(options.timeoutMs || 7000);
  const started = Date.now();
  const safeUrl = redactOpenApiUrl(url);
  try {
    const res = await fetchImpl(url, {
      headers: {
        Accept: 'application/xml,text/xml,*/*',
        ...(options.headers || {}),
      },
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
