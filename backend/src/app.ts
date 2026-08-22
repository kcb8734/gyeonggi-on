import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import promotionsRouter from './routes/promotions';
import couponsRouter from './routes/coupons';

const app = express();
app.use(helmet());
app.use(express.json());

// 헬스체크
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gyeonggi-on-backend' }));

// 결제 관련 민감 엔드포인트는 별도의 강화된 Rate Limit 적용
const redeemLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use('/api/coupons/redeem', redeemLimiter);

app.use('/api/promotions', promotionsRouter);
app.use('/api/coupons', couponsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`경기온 API 서버 실행 중: ${PORT}`);
});

export default app;
