import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import promotionsRouter from './routes/promotions';
import couponsRouter from './routes/coupons';
import festivalsRouter from './routes/festivals';
import merchantsRouter from './routes/merchants';
import adminRouter from './routes/admin';
import homeRouter from './routes/home';
import tourRouter from './routes/tour';
import authRouter from './routes/auth';
import feedsRouter from './routes/feeds';
import { startFestivalCron } from './jobs/festivalCron';
import { runFestivalSync } from './controllers/festivalListController';
import { pool } from './db/pool';

const ALLOWED_ORIGINS = [
  'https://kdanji.com',
  'https://www.kdanji.com',
  'http://localhost:3000',
];

const app = express();
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || ALLOWED_ORIGINS.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
app.use(express.json());

// 헬스체크
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gyeonggi-on-backend' }));

// Neon PostgreSQL 연결 테스트
app.get('/api/db-test', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    return res.json({
      success: true,
      message: 'Neon PostgreSQL 연결 성공!',
      now: result.rows[0].now,
    });
  } catch (err) {
    console.error('[db-test] PostgreSQL 연결 실패', err);
    return res.status(500).json({
      success: false,
      message: 'Neon PostgreSQL 연결 실패',
    });
  }
});

// 결제/발급 관련 민감 엔드포인트는 별도의 강화된 Rate Limit 적용
const redeemLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
const issueLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
const verifyLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
app.use('/api/coupons/redeem', redeemLimiter);
app.use('/api/coupons/issue', issueLimiter);
app.use('/api/merchants/verify', verifyLimiter);

app.use('/api/promotions', promotionsRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/festivals', festivalsRouter);
app.use('/api/merchants', merchantsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/home', homeRouter);
app.use('/api/tour', tourRouter);
app.use('/api/auth', authRouter);
app.use('/api/feeds', feedsRouter);
app.get('/api/cron/festivals', runFestivalSync);
app.post('/api/cron/festivals', runFestivalSync);

const PORT = process.env.PORT || 4000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`경기온 API 서버 실행 중: ${PORT}`);
    startFestivalCron();
  });
}

export default app;
module.exports = app;
