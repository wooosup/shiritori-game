# Mobile Release Baseline

## App Metadata (고정)

- App Name: `Shiritori Game`
- App ID: `com.shiritori.game`
- webDir: `dist`
- OAuth Redirect URI: `shiritori://auth/callback`

## 필수 환경 변수

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_WEB_CLIENT_ID`
- `VITE_GOOGLE_ANDROID_CLIENT_ID`
- `localhost`, `example.supabase.co`, `public-anon-key` placeholder 값은 릴리즈에서 금지

검증:

```bash
npm run mobile:check-env
```

프로젝트 부트스트랩:

```bash
bash scripts/bootstrap-mobile-projects.sh
```

## 개발용 빌드

```bash
npm run android:build
```

## 내부 테스트 릴리즈 빌드

```bash
npm run android:release
```

Android release signing 필수 환경 변수:

```bash
export ANDROID_KEYSTORE_PATH="/absolute/path/to/release-keystore.jks"
export ANDROID_KEYSTORE_PASSWORD="..."
export ANDROID_KEY_ALIAS="..."
export ANDROID_KEY_PASSWORD="..."
```

## 내부 배포 채널

- Android: Google Play Console Internal testing

## API 연결 점검

```bash
npm run api:check:dev
npm run api:check:prod
```
