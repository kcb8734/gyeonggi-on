/**
 * Vercel Node.js 서버리스 엔트리.
 * Express 앱을 그대로 내보냅니다.
 */
const loaded = require('../backend/dist/app');
const app = loaded.default || loaded;
module.exports = app;
