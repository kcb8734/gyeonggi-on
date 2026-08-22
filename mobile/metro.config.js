const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const previous = config.server?.enhanceMiddleware;
const LIVE_BANNER = '온앤온 미리보기 갱신됨 · TourAPI 4.0 · 현장피드 1,000P · 한글IME';

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
    res.write = (chunk, encoding, callback) => {
      if (chunk) chunks.push(Buffer.from(chunk));
      if (typeof encoding === 'function') encoding();
      else if (typeof callback === 'function') callback();
      return true;
    };
    res.end = (chunk, encoding, callback) => {
      if (chunk) chunks.push(Buffer.from(chunk));
      let html = Buffer.concat(chunks).toString('utf8');
      const stamp = String(Date.now());
      if (html.includes('id="root"') && !html.includes('onandon-live-banner')) {
        html = html
          .replace('<title>온앤온</title>', '<title>온앤온 · TourAPI 리워드</title>')
          .replace(
            /<div id="root"><\/div>/,
            `<div id="onandon-live-banner" style="position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#1D4ED8;color:#fff;font:700 13px/1.45 sans-serif;text-align:center;padding:10px 12px;">${LIVE_BANNER}</div><div id="root" style="padding-top:44px"></div>`,
          )
          .replace(/AppEntry\.bundle\?/g, `AppEntry.bundle?v=${stamp}&`);
      }
      const buf = Buffer.from(html);
      res.setHeader('Content-Length', String(buf.length));
      if (typeof encoding === 'function') {
        return origEnd(buf, encoding);
      }
      return origEnd(buf, encoding, callback);
    };
    void origWrite;
    return inner(req, res, next);
  };
};

module.exports = config;
