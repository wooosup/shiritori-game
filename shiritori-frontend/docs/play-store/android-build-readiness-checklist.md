# Android Build Readiness Checklist

Google Play 업로드용 Android AAB를 만들기 전에 확인하는 체크리스트입니다.

## 1) Android SDK 준비

1. Android Studio 또는 Command-line SDK가 설치되어 있다
2. Android SDK Platform 35가 설치되어 있다
3. Android SDK Build-Tools가 설치되어 있다
4. Android SDK Platform-Tools가 설치되어 있다
5. `android/local.properties` 또는 `ANDROID_HOME`으로 SDK 경로를 찾을 수 있다

예시:

```properties
sdk.dir=/Users/<your-name>/Library/Android/sdk
```

주의:
- `android/local.properties`는 로컬 파일로만 유지하고 커밋하지 않는다
- CI에서는 `ANDROID_HOME` 또는 `ANDROID_SDK_ROOT`로 주입한다

## 2) 릴리즈 서명 준비

1. 릴리즈 keystore 파일 경로를 알고 있다
2. 아래 환경 변수가 현재 셸 또는 CI에 주입되어 있다

```bash
export ANDROID_KEYSTORE_PATH="/absolute/path/to/release-keystore.jks"
export ANDROID_KEYSTORE_PASSWORD="..."
export ANDROID_KEY_ALIAS="..."
export ANDROID_KEY_PASSWORD="..."
```

주의:
- keystore와 비밀번호는 저장소에 커밋하지 않는다
- 로컬 개발은 OS 키체인/비밀번호 관리자를 통해 주입한다

## 3) 앱 설정 사전 점검

1. `npm run mobile:check-env`가 통과한다
2. `VITE_API_URL`이 실제 배포 백엔드를 가리킨다
3. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`가 실제 값이다
4. `VITE_GOOGLE_WEB_CLIENT_ID`, `VITE_GOOGLE_ANDROID_CLIENT_ID`가 실제 값이다
5. Supabase OAuth Redirect URL에 `shiritori://auth/callback`가 등록되어 있다

## 4) 빌드 순서

`shiritori-frontend` 폴더에서 실행:

```bash
npm run mobile:check-env
npm run build
npm run cap:sync:android
cd android && ./gradlew bundleRelease
```

한 번에 실행할 때:

```bash
npm run android:release
```

## 5) 성공 기준

1. `android/app/build/outputs/bundle/release/app-release.aab`가 생성된다
2. 빌드 로그에 `SDK location not found` 오류가 없다
3. 빌드 로그에 `Missing Android release signing env` 오류가 없다
4. Play Console Internal testing에 업로드 가능한 AAB가 준비된다

## 6) 실패 시 우선 확인

1. `SDK location not found`
   - `android/local.properties` 또는 `ANDROID_HOME` 확인
2. `Missing Android release signing env`
   - 4개 `ANDROID_KEY*` 환경 변수 확인
3. Google 로그인 `code 10`
   - Google Cloud Console의 Android OAuth Client 패키지명 `com.shiritori.game`와 SHA-1 확인
