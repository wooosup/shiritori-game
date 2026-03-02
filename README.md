# Shiritori

Spring Boot + React + Capacitor 기반 일본어 끝말잇기 프로젝트입니다.

## 방향

- 서비스 기준은 Android 앱입니다.
- 백엔드는 기존 Spring API를 원격으로 유지합니다.

## 스택

- Frontend: React, TypeScript, Tailwind, Capacitor
- Backend: Spring Boot, JPA, PostgreSQL
- Auth: Supabase OAuth + JWT

## 개발 진입

1. Backend

```bash
cd shiritori-backend
./gradlew bootRun
```

계정 탈퇴(인증 계정까지 삭제)를 사용하려면 백엔드 실행 환경에 아래 변수가 필요합니다.

```bash
export SUPABASE_PROJECT_URL="https://<project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

2. Frontend

```bash
cd shiritori-frontend
npm install
npm run dev
```

## 검증 명령

```bash
cd shiritori-backend && ./gradlew test
cd shiritori-frontend && npm run test:run && npm run build
```

## 모바일 내부 테스트 배포

- Android Internal: `npm run android:release`
- 릴리즈 전 필수: `npm run mobile:check-env` (`localhost`/`example.supabase.co`/`public-anon-key` 금지)
- Android release signing env: `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

자세한 배포 절차는 `shiritori-frontend/docs/internal-testing-release.md` 참고.

## Google Play 런칭 준비 문서

1. 체크리스트: `shiritori-frontend/docs/play-store-upload-checklist.md`
2. Data safety: `shiritori-frontend/docs/play-store/data-safety-matrix.md`
3. Privacy policy 점검: `shiritori-frontend/docs/play-store/privacy-policy-checklist.md`
4. App access 심사 입력: `shiritori-frontend/docs/play-store/app-access-for-review.md`
