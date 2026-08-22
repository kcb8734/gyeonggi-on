const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const previous = config.server?.enhanceMiddleware;

config.server = config.server ?? {};
config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const inner = previous ? previous(metroMiddleware, server) : metroMiddleware;
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    return inner(req, res, next);
  };
};

module.exports = config;
