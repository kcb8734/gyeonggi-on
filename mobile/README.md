# 경기온(Gyeonggi-On) Mobile (Expo / React Native)

> ⚠️ 모바일 앱이므로 Cloudflare Pages 배포 대상이 아닙니다. Expo Go 앱으로 미리보기 하거나 EAS Build로 네이티브 빌드해야 합니다.

## 폴더 구조
```
mobile/
├── App.tsx                  # 네비게이션 엔트리 포인트 (개발용 하드코딩 ID 사용)
├── src/
│   ├── config.ts             # API_BASE_URL 설정
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
- `react-native-maps` — 지도 마커(축제=빨강, 제휴업소=초록)
- `react-native-qrcode-svg` — 쿠폰 QR 코드 생성
- `@react-navigation/native` — 화면 전환
- `axios` — 백엔드 API(`../backend`) 호출

## 연동 백엔드
`../backend` 프로젝트의 `POST /api/promotions`, `POST /api/coupons/redeem` 등의 API를 사용합니다.
`src/config.ts`의 `API_BASE_URL`을 실제 배포 주소로 교체하세요.
