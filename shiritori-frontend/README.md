# Shiritori Frontend (App-First)

Vite + React 기반 클라이언트이며, 운영 기준은 Android 앱입니다.

## 앱 고정 설정

- App Name: `Shiritori Game`
- App ID: `com.shiritori.game`
- webDir: `dist`
- OAuth Redirect: `shiritori://auth/callback`

## 로컬 개발

```bash
npm install
npm run dev
```

## 테스트/빌드

```bash
npm run test:run
npm run build
```

## 주요 라우트

- `#/` 홈 (게임 시작/오늘의 단어/퀴즈/옵션)
- `#/game` 게임 플레이
- `#/wordbook` 단어장 페이지
- `#/ranking` 랭킹 페이지
- `#/legal/privacy` 개인정보처리방침
- `#/legal/account-deletion` 계정 삭제 안내

## 하단 탭 구조

- 홈: 시작 허브
- 단어장: 독립 페이지 이동
- 퀴즈: 홈에서 즉시 모달 실행
- 랭킹: 독립 페이지 이동
- 옵션: 홈에서 바텀시트 실행

## 모바일 빌드

```bash
npm run mobile:check-env
npm run android:build
```

필수 환경 변수:

```bash
export VITE_API_URL="https://<backend-domain>/api"
export VITE_SUPABASE_URL="https://<project>.supabase.co"
export VITE_SUPABASE_ANON_KEY="<anon-key>"
export VITE_GOOGLE_WEB_CLIENT_ID="<google-web-client-id>.apps.googleusercontent.com"
export VITE_GOOGLE_ANDROID_CLIENT_ID="<google-android-client-id>.apps.googleusercontent.com"
export ANDROID_KEYSTORE_PATH="/absolute/path/to/release-keystore.jks" # release only
export ANDROID_KEYSTORE_PASSWORD="<keystore-password>"                 # release only
export ANDROID_KEY_ALIAS="<key-alias>"                                 # release only
export ANDROID_KEY_PASSWORD="<key-password>"                           # release only
```

`localhost`, `example.supabase.co`, `public-anon-key` 값은 릴리즈에서 차단됩니다.

## 내부 테스트 릴리즈

```bash
npm run android:release
```

참고:
- `android:release`는 release signing env가 없으면 실패합니다.

세부 절차는 `docs/internal-testing-release.md` 참고.

## Google Play 제출 문서

아래 문서를 기준으로 Play Console 항목을 작성합니다.

1. `docs/play-store-upload-checklist.md`
2. `docs/play-store/data-safety-matrix.md`
3. `docs/play-store/privacy-policy-checklist.md`
4. `docs/play-store/app-access-for-review.md`

정책 페이지(정적 파일):

1. `public/legal/privacy-ko.html`
2. `public/legal/account-deletion-ko.html`
