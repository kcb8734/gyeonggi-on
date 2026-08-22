# 경기온(Gyeonggi-On) 상권 연계 축제 플랫폼

지자체(경기도) 축제와 소상공인 할인을 1:1 매칭 지원금으로 연계하는 상생 할인 플랫폼입니다.
고객은 앱에서 쿠폰을 발급받아 QR 결제로 즉시 할인받고, 지자체 지원금은 자동으로 정산 트랜잭션에 기록됩니다.

## 완성된 기술 스펙 문서
전체 DB 스키마, API 컨트롤러 전문, 프론트엔드 컴포넌트 전문, 동시성/보안 가이드는 아래 문서를 참고하세요.
- 📄 https://www.genspark.ai/doc_agent?id=8ce0902e-f615-4b49-9938-bc51577d44c3

## 저장소 구조 (Monorepo)
이 저장소는 **두 개의 독립 프로젝트**로 구성됩니다. (루트의 `src/`, `wrangler.jsonc` 등은 Cloudflare Pages 템플릿 초기 스캐폴딩 잔재로, 이 프로젝트에서는 사용하지 않습니다.)

```
webapp/
├── backend/     # Node.js + TypeScript + Express API (PostgreSQL/Supabase)
│   ├── src/
│   │   ├── types/db.ts               # 6개 테이블 매핑 타입
│   │   ├── db/pool.ts                # PostgreSQL 커넥션 풀
│   │   ├── controllers/
│   │   │   ├── promotionController.ts  # POST /api/promotions (지자체 1:1 매칭)
│   │   │   ├── couponController.ts     # POST /api/coupons/issue, /redeem
│   │   │   └── festivalController.ts   # GET /api/festivals/nearby, /:id/map
│   │   ├── routes/
│   │   ├── middleware/auth.ts        # JWT 인증
│   │   └── app.ts
│   ├── migrations/0001_init_schema.sql
│   ├── seed.sql
│   └── README.md
│
└── mobile/      # React Native (Expo) 앱
    ├── App.tsx
    ├── src/
    │   ├── config.ts
    │   ├── components/map/MainMap.tsx        # 메인 지도 (축제/제휴업소 핀)
    │   └── screens/
    │       ├── PromotionRegisterScreen.tsx   # 사장님 자율 할인 등록 화면
    │       └── FestivalMerchantMapScreen.tsx # 축제/제휴업소 지도 화면
    └── README.md
```

## 현재 완료된 사항
- ✅ PostgreSQL 6개 테이블 마이그레이션 SQL (`municipalities`, `festivals`, `merchants`, `discount_promotions`, `user_coupons`, `settlement_transactions`)
- ✅ 백엔드 스캐폴딩 완료 — `npm install` 및 `tsc --noEmit` 타입체크 **통과 확인**
- ✅ `POST /api/promotions` — 지자체 예산 `FOR UPDATE` 잠금 → 1:1 매칭 확정(부분 매칭 로직 포함)
- ✅ `POST /api/merchants/verify` — 국세청 사업자등록 상태조회, 계속사업자(`b_stt_cd: 01`)만 프로모션 등록
- ✅ `POST /api/coupons/redeem` — 쿠폰 검증 → 할인 계산 → 예산 원자적 차감 → 정산 트랜잭션(PENDING) 기록
- ✅ 모바일 앱 스캐폴딩 완료 — 사장님 할인 등록 화면, 축제/제휴업소 지도 화면(모달 + QR 발급)
- ✅ `GET /api/festivals/nearby`, `GET /api/festivals/:id/map`, `POST /api/coupons/issue` — 메인 지도가 사용하는 보조 API
- ✅ 메인 지도 컴포넌트(`MainMap`) — 주변 축제 칩, 카테고리 필터, 할인율 마커, 쿠폰 QR 시트
- ✅ 개발용 시드 — 수원/용인/가평 축제 + 제휴업소 + 활성 프로모션

## 아직 실행/검증하지 않은 사항 (스캐폴딩 범위 밖)
- ⬜ 실제 PostgreSQL(로컬 또는 Supabase) 기동 및 마이그레이션 적용
- ⬜ 백엔드 서버 기동 후 API 실제 호출 테스트 (curl/Postman)
- ⬜ `mobile/` 의 `npm install` 및 Expo 앱 실행(Expo Go/EAS Build)
- ⬜ Google Maps API Key 발급 및 `mobile/app.json`에 설정

## ⚠️ 배포 관련 중요 안내
- **backend**: `pg` 드라이버로 PostgreSQL에 직접 TCP 연결하는 구조라 **Cloudflare Workers/Pages에 배포할 수 없습니다.** Railway/Render/Fly.io 등 Node 서버 호스팅이나 Cloudflare Hyperdrive+Workers 재작성이 필요합니다.
- **mobile**: React Native 앱이므로 Cloudflare Pages 대상이 아닙니다. Expo Go 미리보기 또는 EAS Build로 네이티브 빌드해야 합니다.

## 다음 단계 제안
1. Supabase 프로젝트 생성 후 `backend/migrations/0001_init_schema.sql` 적용, `.env`에 `DATABASE_URL` 설정
2. `backend/`에서 `npm run dev`로 로컬 서버 기동 후 Postman으로 `/api/promotions`, `/api/coupons/redeem` 테스트
3. `mobile/`에서 `npm install` → `npx expo start`로 Expo Go 미리보기
4. `mobile/`에서 `npm install` → `npx expo start`로 메인 지도 미리보기
5. 백엔드 호스팅 플랫폼(Railway 등) 결정 후 배포
