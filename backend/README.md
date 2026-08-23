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
│   ├── services/ntsService.ts    # 국세청 사업자등록 상태조회
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
- `POST /api/merchants/verify` — 국세청 사업자등록 상태조회 (`b_stt_cd: 01` 계속사업자)
- `POST /api/promotions` — 소상공인 할인 등록 + 지자체 1:1 매칭 확정 (국세청 계속사업자만)
- `POST /api/coupons/issue` — 고객 쿠폰 발급(QR 코드) + 잔여 수량 차감
- `POST /api/coupons/redeem` — QR 쿠폰 사용 처리 + 정산 트랜잭션 기록
- `GET /api/festivals/nearby` — 주변/소속 지자체 축제 목록 (메인 지도, 할인 등록)
- `GET /api/festivals/:id/map` — 축제 핀 + 활성 제휴업소 핀
- `GET /api/home` — Korea-On 메인 피드
- `POST /api/admin/login` — 관리자 JWT 로그인
- `GET /api/admin/merchants` — 검증 가맹점/매칭 신청 목록
- `POST /api/admin/merchants/:id/approve` — 1:1 매칭 승인/거절
- `GET /api/admin/coupons/stats` — 쿠폰 발행·사용 통계
- `GET /api/admin/budget` — 지자체 예산 잔액/집행률
- `GET /health` — 헬스체크
- `GET /api/db-test` — Neon PostgreSQL 연결 확인 (`SELECT NOW()`)

## 보안/동시성 설계
`SELECT ... FOR UPDATE` 비관적 잠금 + 원자적 조건부 `UPDATE`로 지자체 예산 동시성 이슈를 방어합니다.
자세한 내용은 프로젝트 루트의 기술 스펙 문서를 참고하세요.
