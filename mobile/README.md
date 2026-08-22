# 경기온(Gyeonggi-On) Mobile (Expo / React Native)

> ⚠️ 모바일 앱이므로 Cloudflare Pages 배포 대상이 아닙니다. Expo Go 앱으로 미리보기 하거나 EAS Build로 네이티브 빌드해야 합니다.

## 폴더 구조
```
mobile/
├── App.tsx                  # 네비게이션 엔트리 포인트 (개발용 하드코딩 ID 사용)
├── src/
│   ├── config.ts             # API_BASE_URL 설정
│   ├── api/                  # 백엔드 클라이언트
│   ├── types/map.ts          # 축제/업소 핀 타입
│   ├── hooks/useFestivalMap.ts
│   ├── components/map/
│   │   ├── MainMap.tsx                 # 메인 지도 컴포넌트
│   │   ├── FestivalChipBar.tsx
│   │   ├── CategoryFilterBar.tsx
│   │   ├── MerchantCouponSheet.tsx
│   │   └── MapOverlays.tsx
│   └── screens/
│       ├── PromotionRegisterScreen.tsx   # 사장님 자율 할인 등록 화면
│       └── FestivalMerchantMapScreen.tsx # 축제/제휴업소 지도 화면
├── app.json
└── package.json
```

## 로컬 실행 (참고용 — 이번 스캐폴딩 단계에서는 실행하지 않음)
```bash
npm install
npx expo start   # QR 스캔 후 Expo Go 앱에서 확인
```

## 주요 의존성
- `react-native-maps` — 지도 마커(축제=빨강 핀, 제휴업소=초록 할인율 뱃지)
- `expo-location` — 주변 축제 조회용 현재 위치
- `react-native-qrcode-svg` — 쿠폰 QR 코드 생성
- `@react-navigation/native` — 화면 전환
- `axios` — 백엔드 API(`../backend`) 호출

## 메인 지도
`MainMap`은 `GET /api/festivals/nearby`로 축제 핀을 그리고, 축제 선택 시 `GET /api/festivals/:id/map`으로 제휴업소를 불러옵니다.
업소 탭 → 하단 시트에서 `POST /api/coupons/issue`로 QR 쿠폰을 발급합니다.

## 연동 백엔드
`../backend` 프로젝트의 `POST /api/promotions`, `POST /api/coupons/issue`, `GET /api/festivals/*` 등의 API를 사용합니다.
`src/config.ts`의 `API_BASE_URL`을 실제 배포 주소로 교체하세요.
