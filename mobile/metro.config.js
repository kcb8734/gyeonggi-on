const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const previous = config.server?.enhanceMiddleware;
const LIVE_BANNER = '0822 빨간띠 보이면 최신 · 한글입력수정 · 할인 쿠폰 등록';

config.server = config.server ?? {};
config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const inner = previous ? previous(metroMiddleware, server) : metroMiddleware;
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    const url = String(req.url ?? '');
    const isHtml = url === '/' || url.startsWith('/?') || url.startsWith('/index.html');
    if (!isHtml) {
      return inner(req, res, next);
    }

    const chunks = [];
    const origEnd = res.end.bind(res);
    const origWrite = res.write.bind(res);
    const origSend = typeof res.send === 'function' ? res.send.bind(res) : null;
    const rewrite = (raw) => {
      let html = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw ?? '');
      const stamp = String(Date.now());
      if (html.includes('id="root"') && !html.includes('onandon-live-banner') && !html.includes('onandon-html-banner')) {
        html = html
          .replace(/<title>[^<]*<\/title>/, '<title>온앤온 · 한글입력수정</title>')
          .replace(
            /<div id="root"[^>]*><\/div>/,
            `<div id="onandon-live-banner" style="position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#B91C1C;color:#fff;font:700 13px/1.45 sans-serif;text-align:center;padding:10px 12px;">${LIVE_BANNER}</div><div id="root" style="padding-top:44px"></div>`,
          )
          .replace(/AppEntry\.bundle\?/g, `AppEntry.bundle?v=${stamp}&`);
      }
      return html;
    };
    res.write = (chunk, encoding, callback) => {
      if (chunk) chunks.push(Buffer.from(chunk));
      if (typeof encoding === 'function') encoding();
      else if (typeof callback === 'function') callback();
      return true;
    };
    res.end = (chunk, encoding, callback) => {
      if (chunk) chunks.push(Buffer.from(chunk));
      const buf = Buffer.from(rewrite(Buffer.concat(chunks)));
      res.setHeader('Content-Length', String(buf.length));
      if (typeof encoding === 'function') {
        return origEnd(buf, encoding);
      }
      return origEnd(buf, encoding, callback);
    };
    if (origSend) {
      res.send = (body) => {
        const html = rewrite(body);
        res.setHeader('Content-Length', String(Buffer.byteLength(html)));
        return origSend(html);
      };
    }
    void origWrite;
    return inner(req, res, next);
  };
};

if (process.env.NODE_ENV === 'production') {
  config.transformer = config.transformer ?? {};
  config.transformer.minifierConfig = {
    ...(config.transformer.minifierConfig ?? {}),
    compress: {
      ...(config.transformer.minifierConfig?.compress ?? {}),
      drop_console: true,
      unused: true,
    },
  };
}

module.exports = config;
