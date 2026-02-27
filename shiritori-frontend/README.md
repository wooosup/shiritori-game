# Shiritori Frontend

Vite + React 기반 프론트엔드입니다. 모바일 패키징은 Capacitor를 사용합니다.

## Capacitor 고정 값 (Release 기준)

- **App Name**: `Shiritori Game`
- **App ID**: `com.shiritori.game`
- **webDir**: `dist` (Vite 빌드 산출물)

> 위 값은 릴리즈 문서(`docs/release-mobile.md`)와 동일하게 유지합니다.

## 초기 세팅

```bash
npm install
npx cap add android
npx cap add ios
```

## 표준 빌드 루틴

웹 빌드 → Capacitor 동기화 → 네이티브 빌드 순서를 스크립트로 제공합니다.

```bash
npm run android:build
npm run ios:build
```

공통으로 웹 빌드/동기화만 수행하려면:

```bash
npm run mobile:build
```

## Render API 연결 점검

환경별 API Health 체크 스크립트:

```bash
npm run api:check:dev
npm run api:check:prod
```

- `api:check:dev`: `VITE_API_URL_DEV` → 없으면 `VITE_API_URL` → 없으면 `http://localhost:8080/api`
- `api:check:prod`: `VITE_API_URL_PROD` → 없으면 `VITE_API_URL`

`/api/healthz` 엔드포인트를 호출해 상태를 확인합니다.
