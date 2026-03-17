# Google Cloud & Play Console Checklist

`com.shiritori.game` Android 앱을 Google Cloud Console, Supabase, Google Play Console에 연결할 때 사용하는 체크리스트입니다.

## 1) 프로젝트 고정값

1. Android package name: `com.shiritori.game`
2. Native OAuth redirect URI: `shiritori://auth/callback`
3. Support email: `useop0821@gmail.com`
4. Homepage URL: `https://shiritori-game-gold.vercel.app/`
5. Privacy policy URL: `https://shiritori-game-gold.vercel.app/legal/privacy-ko.html`
6. Terms of service URL: `https://shiritori-game-gold.vercel.app/legal/terms-ko.html`
7. Account deletion URL: `https://shiritori-game-gold.vercel.app/legal/account-deletion-ko.html`

## 2) 배포마다 확인할 값

1. Web client ID
   - 현재 앱 env의 `VITE_GOOGLE_WEB_CLIENT_ID`
2. Android client ID
   - 현재 앱 env의 `VITE_GOOGLE_ANDROID_CLIENT_ID`
3. Upload key SHA-1
   - 로컬 업로드 키에서 `keytool -list -v ...`로 확인
4. Play app signing SHA-1
   - Play Console `App integrity`에서 확인

주의:
- `upload key`와 `app signing key`는 다를 수 있다
- 로컬에서 sideload 테스트한 release 빌드는 `upload key` SHA-1 영향을 받는다
- Play에서 사용자에게 배포되는 빌드는 `app signing key` SHA-1 영향을 받는다

## 3) Google Cloud Console

### 3-1. Google Auth Platform > Branding

1. App name 설정
2. User support email 설정
3. Homepage URL 설정
4. Privacy policy URL 설정
5. 필요 시 Terms of service URL 설정

권장 입력값:
1. Homepage URL: `https://shiritori-game-gold.vercel.app/`
2. Privacy policy URL: `https://shiritori-game-gold.vercel.app/legal/privacy-ko.html`
3. Terms of service URL: `https://shiritori-game-gold.vercel.app/legal/terms-ko.html`
4. Support email: `useop0821@gmail.com`

### 3-2. Credentials > OAuth client IDs

1. Web application client가 존재하는지 확인
   - 이 값은 `VITE_GOOGLE_WEB_CLIENT_ID`와 일치해야 한다
2. Android client를 최소 1개 이상 준비
   - Package name: `com.shiritori.game`
   - SHA-1: 현재 테스트할 서명키 기준으로 입력

권장 구성:
1. Android client for local debug install
   - Package name: `com.shiritori.game`
   - SHA-1: `~/.android/debug.keystore` fingerprint
2. Android client for local release / upload build
   - Package name: `com.shiritori.game`
   - SHA-1: 현재 upload key fingerprint
3. Android client for Play-distributed build
   - Package name: `com.shiritori.game`
   - SHA-1: Play Console `App integrity`의 `App signing key certificate`

주의:
- Google 로그인 `code 10`이 나면 대부분 package name 또는 SHA-1 불일치다
- Play App Signing을 쓰면 Play 배포판은 `upload key`가 아니라 `app signing key` 기준으로 검증된다

## 4) Supabase Console

### 4-1. Authentication > Providers > Google

1. Google provider 활성화
2. Web client ID 입력
3. Web client secret 입력
4. 여러 client ID를 쓰면 comma-separated 형식으로 정리
5. 여러 ID를 적을 때는 web client ID를 가장 앞에 둔다

정리 규칙 예시:
1. `web-client-id`
2. `web-client-id,android-debug-client-id`
3. `web-client-id,android-debug-client-id,android-upload-client-id,android-play-client-id`

### 4-2. URL Configuration

1. Site URL 확인
2. Redirect URLs에 네이티브 callback이 포함되어 있는지 확인

필수 확인값:
1. `shiritori://auth/callback`

## 5) Google Play Console

### 5-1. App integrity

1. 새 앱이면 Play App Signing 사용 여부 결정
2. 첫 업로드 전 upload key를 안전하게 백업
3. 첫 업로드 후 `App signing key certificate` SHA-1 확인
4. 확인한 SHA-1을 다시 Google Cloud Console Android OAuth client에 반영

주의:
- 첫 업로드 이후에는 upload key를 잃어버리면 업데이트가 번거로워진다
- 기존 앱에 이미 등록된 upload key가 있다면 새 키를 만들지 말고 기존 키를 사용해야 한다

### 5-2. App content

1. Privacy policy URL 등록
2. App access 설명 등록
3. Data safety 작성
4. Account deletion 안내 검토
5. Content rating questionnaire 작성
6. Target audience and content 작성
7. Ads declaration 해당 여부 확인

이 저장소 문서:
1. `docs/play-store/app-access-for-review.md`
2. `docs/play-store/data-safety-matrix.md`
3. `docs/play-store/privacy-policy-checklist.md`
4. `docs/play-store-upload-checklist.md`

### 5-3. Internal testing

1. `android/app/build/outputs/bundle/release/app-release.aab` 업로드
2. 테스트 계정 추가
3. Google 로그인, 게임 시작, 계정 탈퇴 동선 점검

## 6) 이 프로젝트 기준 마지막 점검

1. `VITE_GOOGLE_WEB_CLIENT_ID`는 유지하되 실제 Google Cloud의 Web client와 일치해야 한다
2. `VITE_GOOGLE_ANDROID_CLIENT_ID`는 현재 사용하는 Android OAuth client와 맞춰 둔다
3. Play 첫 업로드 뒤에는 `App signing key certificate` SHA-1 기반 Android client도 추가한다
4. Android release build가 성공해도 Play 배포판 로그인은 `app signing key` 미반영 상태면 실패할 수 있다
5. Internal testing 배포마다 로그인/계정 탈퇴/오프라인 오류 케이스를 최소 1회 재검증한다

## 6-1) Internal testing 배포 루틴(요약)

1. `npm run mobile:check-env`
2. `npm run android:release`
3. Play Console `Internal testing`에 `app-release.aab` 업로드
4. opt-in 설치 후 실기기에서 아래를 확인
   - Google 로그인 성공
   - 홈 복귀 및 게임 시작 가능
   - 계정 탈퇴 성공/실패 메시지 노출
   - 오프라인 시 오류 메시지와 재시도 동작
5. 실패 시 우선 확인
   - 로그인 실패(`code 10`): package name/SHA-1 불일치
   - 로그인은 성공하나 앱 복귀 실패: redirect URI 미등록
   - 탈퇴 실패 반복: 백엔드 설정 또는 네트워크 상태 점검

## 7) 참고 명령

Upload key fingerprint 확인:

```bash
keytool -list -v -keystore /absolute/path/to/upload-key.jks -alias <alias>
```

현재 프로젝트 release bundle 생성:

```bash
cd shiritori-frontend/android
./gradlew bundleRelease
```
