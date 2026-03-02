# Internal Testing Release Guide

## 1. 사전 준비

1. Supabase OAuth Redirect URL에 `shiritori://auth/callback` 등록
2. 서명/인증서 관련 시크릿은 `api-vault`에서만 주입
3. 필수 환경 변수 준비

```bash
export VITE_API_URL="https://<backend-domain>/api"
export VITE_SUPABASE_URL="https://<project>.supabase.co"
export VITE_SUPABASE_ANON_KEY="<anon-key>"
export VITE_GOOGLE_WEB_CLIENT_ID="<google-web-client-id>.apps.googleusercontent.com"
export VITE_GOOGLE_ANDROID_CLIENT_ID="<google-android-client-id>.apps.googleusercontent.com"
export ANDROID_KEYSTORE_PATH="/absolute/path/to/release-keystore.jks"
export ANDROID_KEYSTORE_PASSWORD="<keystore-password>"
export ANDROID_KEY_ALIAS="<key-alias>"
export ANDROID_KEY_PASSWORD="<key-password>"
```

4. 환경 검증

```bash
npm run mobile:check-env
```

주의:
- `VITE_API_URL=http://localhost...`는 내부 테스트 릴리즈에서 허용되지 않음
- `VITE_SUPABASE_URL=https://example.supabase.co`는 허용되지 않음
- `VITE_SUPABASE_ANON_KEY=public-anon-key`는 허용되지 않음
- `VITE_GOOGLE_WEB_CLIENT_ID=replace-with-google-web-client-id...`는 허용되지 않음
- `VITE_GOOGLE_ANDROID_CLIENT_ID=replace-with-google-android-client-id...`는 허용되지 않음

## 2. Android Internal 배포

1. 릴리즈 빌드 생성

```bash
npm run android:release
```

2. 산출물 업로드
- Play Console > Testing > Internal testing
- `android/app/build/outputs/bundle/release/*.aab` 업로드

## 3. 스모크 체크리스트

1. 앱 실행 후 로그인 버튼 동작
2. Google OAuth 완료 후 앱 복귀
3. 게임 시작/턴 입력/PASS/포기
4. 단어장 저장/조회/삭제
5. 퀴즈 진입/종료
