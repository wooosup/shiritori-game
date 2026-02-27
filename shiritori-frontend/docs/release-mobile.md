# Mobile Release Baseline

## App Metadata (고정)

- App Name: `Shiritori Game`
- App ID (Package/BUNDLE ID): `com.shiritori.game`
- webDir: `dist`

## 플랫폼 프로젝트 생성

```bash
npm install
npx cap add android
npx cap add ios
```

## 표준 빌드 루틴

### Android

```bash
npm run android:build
```

실행 순서:
1. `npm run build`
2. `npm run cap:sync:android`
3. `cd android && ./gradlew assembleDebug`

### iOS

```bash
npm run ios:build
```

실행 순서:
1. `npm run build`
2. `npm run cap:sync:ios`
3. `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator build`

## API 연결 점검 (Render)

사전 조건: 환경 변수에 Render API URL을 설정.

- 개발 환경 예시: `VITE_API_URL_DEV=https://<render-domain>/api`
- 운영 환경 예시: `VITE_API_URL_PROD=https://<render-domain>/api`

점검 명령:

```bash
npm run api:check:dev
npm run api:check:prod
```

검증 대상 엔드포인트:
- `GET {VITE_API_URL_*}/healthz`
