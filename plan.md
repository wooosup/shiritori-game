# Shiritori Android App-Only Plan

## Goal

웹 보조 구조를 제거하고 Android 내부 테스트/프로덕션 배포 기준으로 앱 운영을 고정한다.  
백엔드는 기존 Spring API를 유지하며 앱 인증/안정성 요구를 충족한다.

## Scope

1. Android 런타임을 1급 기준으로 고정
2. Google 로그인은 Android OAuth Client 기준으로 안정화
3. 내부 배포는 Google Play Internal testing만 지원
4. 문서/스크립트/CI에서 비운영 플랫폼 경로 제거

## Current Baseline

1. Android release AAB 생성 성공
2. `versionCode` 자동 증가 스크립트 적용
3. 비운영 플랫폼 빌드 스크립트/의존성/문서 제거 진행 완료
4. 로그인 실패 원인은 Android Google OAuth 설정(code 10)으로 확인됨

## Execution Tracks

### Track A: Auth Stabilization (Android)

1. Google Cloud Console에 Android OAuth Client 등록  
   - package: `com.shiritori.game`  
   - SHA-1: debug / release 각각 등록
2. `VITE_GOOGLE_ANDROID_CLIENT_ID`를 env에 설정
3. 앱 재빌드/동기화
4. 에뮬레이터/실기기 로그인 성공 검증

Acceptance:
1. Google 로그인 버튼 탭 시 계정 선택 화면 진입
2. 로그인 완료 후 홈 복귀 및 세션 유지
3. 더 이상 `GoogleAuth code 10` 미발생

### Track B: Android Release Operations

1. release keystore 기반 서명 env 고정
2. `npm run android:release`로 AAB 생성
3. Play Console Internal testing 업로드
4. 테스터 opt-in 링크 배포 및 스모크 테스트

Acceptance:
1. `app-release.aab` 생성
2. Internal track 배포 완료
3. 로그인/게임 시작/턴 처리/단어장/퀴즈 스모크 통과

### Track C: Documentation/CI Hardening

1. Android-only 문서 유지
2. 모바일 env 체크에 Android OAuth env 필수화 유지
3. CI에서 frontend test/build + env contract 체크 유지

Acceptance:
1. 신규 엔지니어가 Android 문서만 보고 빌드/업로드 가능
2. CI green (backend test, frontend test/build, mobile-env-check)

## Branch Strategy

1. `feat/backend-*`: 백엔드 API/보안/운영 변경
2. `feat/frontend-*`: 앱 UI/런타임/스크립트 변경
3. `feat/integration-*`: 문서/CI/배포 프로세스 변경

## Operational Notes

1. 시크릿은 `api-vault`를 소스 오브 트루스로 관리
2. 릴리즈 전 필수 검증:
   - `npm run mobile:check-env`
   - `npm run test:run`
   - `npm run build`
3. Play 업로드 전 `versionCode` 중복 여부 확인
