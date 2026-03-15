# Internal Testing Release Guide

## 0. 테스트 대상 고정

1. 테스트 트랙: Play Console `Testing > Internal testing`
2. 패키지명: `com.shiritori.game`
3. 빌드 산출물: `android/app/build/outputs/bundle/release/app-release.aab`
4. 빌드 식별값 기록: `versionCode`, `versionName`, 업로드 시간

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

## 3. 실기기 QA 시나리오 (필수)

1. 로그인 성공
   - 절차: 신규 설치 -> `Google로 시작하기` -> 계정 선택 -> 홈 복귀
   - 기대 결과: 로그인 직후 홈 진입, 무한 로딩/빈 화면 없음
2. 앱 복귀 동선
   - 절차: 로그인 상태에서 앱 백그라운드 30초 -> 포그라운드 복귀
   - 기대 결과: 세션 유지, 화면 깨짐/강제 로그아웃 없음
3. 로그아웃
   - 절차: 옵션 -> 로그아웃 -> 시작 화면 복귀
   - 기대 결과: 시작 화면에서 재로그인 가능
4. 계정 탈퇴 성공
   - 절차: 옵션 -> 계정 탈퇴 -> 확인
   - 기대 결과: 성공 메시지 후 시작 화면 복귀, 동일 계정 재로그인 시 신규 사용자 흐름
5. 계정 탈퇴 실패 케이스
   - 절차: 네트워크를 끊은 상태에서 계정 탈퇴 실행
   - 기대 결과: 실패 메시지 노출, 앱이 멈추지 않고 재시도 가능
6. 네트워크 장애 케이스
   - 절차: 홈/랭킹/단어장 화면에서 오프라인 전환
   - 기대 결과: 화면별 오류 메시지와 재시도 액션 노출, 크래시 없음
7. 핵심 플레이 흐름
   - 절차: 게임 시작 -> 턴 입력 -> PASS -> 포기 -> 결과 확인
   - 기대 결과: 입력/상태 전환이 끊기지 않고 결과 화면으로 종료

## 4. 스모크 체크리스트

1. 앱 실행 후 로그인 버튼 동작
2. Google OAuth 완료 후 앱 복귀
3. 게임 시작/턴 입력/PASS/포기
4. 단어장 저장/조회/삭제
5. 퀴즈 진입/종료
6. 정책/탈퇴 동선 검증(옵션 > 개인정보처리방침, 계정 삭제 안내, 계정 탈퇴)
7. 공개 운영 링크 확인(필요 시 `/notices/latest.json`, `/api/healthz`)

## 5. Internal 재배포 루틴

1. 빌드 생성: `npm run android:release`
2. Internal testing에 업로드 후 `Start rollout to Internal testing`
3. 테스터 opt-in 링크 재공지
4. 위 `3. 실기기 QA 시나리오`를 최소 1대에서 재검증
5. 결과 기록(권장)
   - `build`: versionCode/versionName
   - `device`: 제조사/OS
   - `login`: pass/fail
   - `delete account`: pass/fail
   - `offline`: pass/fail
   - `notes`: 이슈 링크 또는 재현 메모
