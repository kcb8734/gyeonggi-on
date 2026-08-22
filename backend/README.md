# 경기온(Gyeonggi-On) Backend

지자체 연계 축제·상권 상생 할인 플랫폼의 백엔드 API (Node.js + TypeScript + Express + PostgreSQL/Supabase)

> ⚠️ 이 백엔드는 `pg` 드라이버로 PostgreSQL에 직접 TCP 연결하는 방식이라 **Cloudflare Workers/Pages에는 배포할 수 없습니다.**
> Railway / Render / Fly.io 같은 Node 서버 호스팅, 또는 Cloudflare Hyperdrive + Workers 재작성이 필요합니다.

## 폴더 구조
```
backend/
├── src/
│   ├── types/db.ts               # DB 스키마 매핑 타입
│   ├── db/pool.ts                # PostgreSQL 커넥션 풀
│   ├── controllers/
│   │   ├── promotionController.ts  # POST /api/promotions
│   │   └── couponController.ts     # POST /api/coupons/redeem
│   ├── routes/
│   ├── middleware/auth.ts        # JWT 인증
│   └── app.ts
├── migrations/0001_init_schema.sql
├── seed.sql
└── .env.example
```

## 로컬 실행 (참고용 — 이번 스캐폴딩 단계에서는 실행하지 않음)
```bash
cp .env.example .env   # DATABASE_URL 등 채우기
npm install
npm run build
npm run db:migrate     # migrations/*.sql 적용
node dist/app.js        # 또는 npm run dev (tsx watch)
```

## 주요 엔드포인트
- `POST /api/promotions` — 소상공인 할인 등록 + 지자체 1:1 매칭 확정
- `POST /api/coupons/redeem` — QR 쿠폰 사용 처리 + 정산 트랜잭션 기록
- `GET /health` — 헬스체크

## 보안/동시성 설계
`SELECT ... FOR UPDATE` 비관적 잠금 + 원자적 조건부 `UPDATE`로 지자체 예산 동시성 이슈를 방어합니다.
자세한 내용은 프로젝트 루트의 기술 스펙 문서를 참고하세요.
