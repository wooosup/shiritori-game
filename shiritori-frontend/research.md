# Shiritori Frontend Research

작성 시각: 2026-02-28 14:41 KST
대상 범위: `shiritori-frontend/` 전체 (설정/코드/문서/스크립트/정적자산)

## 1. 한눈에 보는 프론트엔드

React + Vite 기반 SPA이며, 핵심 흐름은 다음과 같다.

1. 홈 화면에서 랭킹/단어 통계/배너 확인
2. Supabase OAuth(구글) 로그인
3. 닉네임 설정 후 게임 시작
4. 게임 중 턴 입력, PASS, 시간제한 처리
5. AI 단어를 단어장에 저장
6. 단어장 조회/삭제/퀴즈 풀이

주요 특징:

- Supabase session + JWT를 API Authorization Bearer로 자동 주입
- Axios interceptor로 GET 재시도(최대 2회, exponential backoff)
- 401 인증 실패 시 강제 로그아웃/루트 리다이렉트
- 모바일 뷰포트 대응(`visualViewport`) 및 Capacitor 패키징 지원

## 2. 기술 스택/빌드

### 2.1 런타임

- React `19.2.0`
- React Router `7.13.0`
- TypeScript `~5.9.3`
- Zustand `5.x`
- Axios `1.13.x`
- Supabase JS/Auth UI
- TailwindCSS `3.4.x`

### 2.2 빌드 도구

- Vite `7.2.x`
- ESLint flat config
- PostCSS + Tailwind

### 2.3 모바일 패키징

Capacitor 설정 고정값:

- appId: `com.shiritori.game`
- appName: `Shiritori Game`
- webDir: `dist`

제공 스크립트:

- `android:build`: 웹 빌드 -> cap sync android -> gradle assembleDebug
- `mobile:build`: 웹 빌드 -> cap sync android

## 3. 엔트리/라우팅/전역 초기화

## 3.1 엔트리 (`src/main.tsx`)

- `<StrictMode><App/></StrictMode>` 렌더링
- 개발 모드에서 콘솔 출력:
  - `VITE_API_URL`
  - `VITE_SUPABASE_ANON_KEY`

## 3.2 앱 루트 (`src/App.tsx`)

### 라우트

- `/` -> `Home`
- `/game` -> `GamePage`

### 초기 인증 처리

1. `ReactGA.initialize("G-E9JYF0HN3G")`
2. `supabase.auth.getSession()`으로 초기 세션 반영
3. `onAuthStateChange` 구독으로 session 변경 동기화
4. 로그인 성공 시 `closeLoginModal()` 호출

### 로그인 모달

- 루트에 `LoginModal`이 항상 마운트
- 실제 open trigger는 `authStore.isLoginModalOpen`

관찰:

- 현재 코드에서는 `openLoginModal()` 호출 지점이 없음
- 홈에서는 직접 `signInWithOAuth`를 호출하므로 `LoginModal`은 사실상 미사용 상태

## 4. API 레이어 (`src/api/axios.ts`)

## 4.1 Supabase 클라이언트

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 4.2 API 클라이언트

- baseURL: `VITE_API_URL` 또는 `http://localhost:8080/api`
- timeout: 30초
- 기본 `Content-Type: application/json`

## 4.3 Request interceptor

- 요청마다 `supabase.auth.getSession()` 실행
- access_token 존재 시 `Authorization: Bearer ...` 설정

## 4.4 Response interceptor

- GET 전용 재시도
  - retry 대상: timeout/네트워크 오류/5xx/429
  - 401/403은 재시도 제외
  - 최대 2회, 지연 700ms -> 1400ms
- timeout(`ECONNABORTED`) 경고 로그
- 401 + auth 헤더 포함 시:
  - `supabase.auth.signOut()`
  - `localStorage.clear()`
  - 현재 경로가 `/` 아니면 강제 리다이렉트

## 5. 상태 관리

`src/stores/authStore.ts`

상태:

- `session: Session | null`
- `isLoginModalOpen: boolean`

액션:

- `setSession`
- `openLoginModal`
- `closeLoginModal`

## 6. 페이지 상세

## 6.1 홈 페이지 (`src/pages/Home.tsx`)

## 초기 로딩 시퀀스

`useEffect(init)`에서 병렬 초기화:

1. `/words/count`, `/words/random` 동시 호출
2. `supabase.auth.getSession()`, `/ranks` 동시 호출
3. 세션 있으면 `/profiles/me` 호출
4. 닉네임 없으면 닉네임 모달 오픈
5. auth state listener 등록

추가 안정장치:

- `isMounted` ref로 언마운트 후 state update 방지
- 로딩 타임아웃(1초) fallback

## 홈 UI 기능

- 로그인/로그아웃 버튼
- 닉네임 표시 및 변경
- 난이도 선택(N5~N1, ALL)
- 게임 시작 버튼
- 랭킹 표
- 하단 단어 티커(랜덤 단어/뜻)
- 모달 4종:
  - `NicknameModal`
  - `RuleModal`
  - `SearchModal`
  - `WordBookModal`
  - `QuizModal`

## 게임 시작 진입

- 비로그인: OAuth 로그인 유도
- 닉네임 없음: 닉네임 모달 강제
- 조건 충족: `/game` 라우팅 + `state.level` 전달

## 6.2 게임 페이지 (`src/pages/GamePage.tsx`)

### 초기화

- 첫 마운트 1회 `startGame()` 실행
- `POST /games/start`로 gameId 및 시작 단어 수신
- 히스토리에 AI 첫 메시지 삽입

### 타이머

- 게임 시작 후 1초마다 `timeLeft` 감소 (20초)
- 0 도달 시 `handleTimeOver()` 호출:
  - 로컬 상태 game over 처리
  - 서버에 `POST /games/{id}/turn` with `TIME_OVER_SIGNAL`

### 턴 제출

1. 공백/게임오버/로딩 상태 검증
2. `useShiritoriValidation(history)`로 프론트 사전 검증
3. 사용자 메시지 optimistic append
4. `/games/{id}/turn` 호출
5. 응답 상태별 처리
   - PLAYING: AI 메시지 추가, 타이머 20초 reset
   - WIN/GAME_OVER: 결과 모달 표시
6. 실패 시 optimistic 메시지 rollback + 입력 복원

### PASS

- PASS 모달 확인 후 `/games/{id}/pass` 호출
- `remainingPass` 동기화
- AI 응답 메시지 추가

### 단어장 저장

- AI 말풍선 클릭 시 `/wordBooks` 저장
- 성공/중복/기타 오류를 toast로 표시

### 종료

- 포기 버튼 -> `/games/{id}/quit` 호출 시도 후 홈 이동

### 모바일 대응

- `window.visualViewport` resize/scroll 이벤트로 루트 높이 동기화
- 키보드 등장 시 스크롤 위치 보정

## 7. 입력 검증 훅

`src/hooks/useShiritoriValidation.ts`

검증 정책:

1. history 없음 -> "게임 준비 중"
2. 입력 trim + NFC 정규화
3. 가타카나를 히라가나로 변환
4. 중복 입력 단어 검사
5. Kana-only 문자열인 경우에만 끝말 규칙 검증
   - 한자/혼합문자면 규칙 검증 스킵(서버 검증에 위임)
6. 마지막 AI 단어 기준 연결 가능 여부 판별
   - 작은 글자/요음/청음 예외 지원

오류 메시지 형식:

- `'X'(으)로 시작해야 합니다.`

## 8. 일본어 유틸

`src/utils/japanese.ts`

제공 함수:

- `toBigKana`: 작은 글자 -> 큰 글자
- `toSeion`: 탁음/반탁음 -> 청음
- `normalizeForCheck`: NFC -> 히라가나화 -> 큰글자화 -> 청음화
- `isSmallKana`: 작은 Kana 판별

백엔드 `JapaneseUtils`와 유사한 규칙으로 클라이언트 선검증을 맞추고 있다.

## 9. 모달 컴포넌트 상세

## 9.1 `NicknameModal`

- 닉네임 입력(최대 10자) + 클라이언트 검증
- `POST /profiles/nickname`
- `canClose` false인 경우 강제 설정 UX

## 9.2 `SearchModal`

- `GET /words/search?keyword=...`
- 실패 시 shake 애니메이션, 에러 텍스트는 미노출

## 9.3 `WordBookModal`

- 리스트 조회: `GET /wordBooks`
- 단어 추가: `POST /wordBooks`
- 단어 삭제: `DELETE /wordBooks/{id}`
- reading/meaning 토글(보기/숨김)
- 삭제 확인 인라인 UI

## 9.4 `QuizModal`

- `GET /wordBooks/quiz`로 문제 로딩
- 1초 간격 자동 다음 문제 진행
- 최종 점수/결과 화면

## 9.5 `RuleModal`

- 게임 규칙 정적 안내

## 9.6 `LoginModal`

- Supabase Auth UI 기반 Google 로그인 전용
- 현재 코드 플로우 상 실사용 트리거 없음

## 10. API 사용 매핑

페이지/컴포넌트별 호출:

- `Home`
  - `GET /words/count`
  - `GET /words/random`
  - `GET /ranks`
  - `GET /profiles/me`
- `GamePage`
  - `POST /games/start`
  - `POST /games/{id}/turn`
  - `POST /games/{id}/pass`
  - `POST /games/{id}/quit`
  - `POST /wordBooks` (AI 단어 저장)
- `NicknameModal`
  - `POST /profiles/nickname`
- `SearchModal`
  - `GET /words/search`
- `WordBookModal`
  - `GET /wordBooks`
  - `POST /wordBooks`
  - `DELETE /wordBooks/{id}`
- `QuizModal`
  - `GET /wordBooks/quiz`

## 11. 환경변수 정리

앱 코드/스크립트에서 확인된 키:

- `VITE_API_URL`
- `VITE_API_URL_DEV`
- `VITE_API_URL_PROD`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

`check-render-api.mjs` 규칙:

- `--env dev`: `VITE_API_URL_DEV` -> `VITE_API_URL` -> localhost fallback
- `--env prod`: `VITE_API_URL_PROD` -> `VITE_API_URL`

## 12. SEO/정적 자산

- `public/robots.txt`: 전체 허용 + sitemap 위치 명시
- `public/sitemap.xml`: 홈 URL 1건 (`lastmod=2026-02-04`)
- `public/logo.png`: 808x817 PNG
- `index.html`: OG 태그/description/keywords/favicon 포함

## 13. 관찰된 리스크/개선 포인트

1. 패키지 의존성 누락 가능성
   - `App.tsx`는 `react-ga4`를 import하지만 `package.json` 의존성 목록에 명시되지 않음
2. 개발 로그에 anon key 노출
   - `main.tsx`에서 DEV 모드 콘솔 출력
3. 로그인 모달 dead path 가능성
   - `openLoginModal` 호출 지점 부재
4. 홈에서 일부 API 실패 시 부분 렌더링
   - `Promise.allSettled` 구조라 기능별 degrade는 좋지만, 에러 상태 UI는 약함
5. 게임 페이지 인라인 `<style>` 대량 삽입
   - 유지보수 관점에서 CSS 파일 분리 여지 있음
6. 클라이언트 검증/서버 검증의 의도된 이중화
   - 현재는 서버가 최종 권위, 클라이언트는 UX 보조

## 14. 파일 인덱스 (역할 기준)

### 빌드/설정/문서

- `package.json`: 스크립트/의존성
- `package-lock.json`
- `vite.config.ts`: react plugin + dedupe
- `tsconfig*.json`: TS 설정
- `eslint.config.js`
- `postcss.config.js`
- `tailwind.config.js`
- `capacitor.config.json`
- `README.md`
- `docs/release-mobile.md`

### HTML/정적 자산

- `index.html`
- `public/logo.png`
- `public/robots.txt`
- `public/sitemap.xml`

### 스크립트

- `scripts/check-render-api.mjs`: health check CLI

### 앱 코드

- `src/main.tsx`: 엔트리
- `src/App.tsx`: 라우팅 + auth listener + GA
- `src/App.css`: 기본 템플릿 스타일(현재 미사용)
- `src/index.css`: Tailwind + 애니메이션 유틸
- `src/api/axios.ts`: Supabase/API 클라이언트
- `src/stores/authStore.ts`: auth 상태
- `src/hooks/useShiritoriValidation.ts`: 게임 입력 선검증
- `src/utils/japanese.ts`: 일본어 문자 유틸
- `src/pages/Home.tsx`
- `src/pages/GamePage.tsx`
- `src/components/LoginModal.tsx`
- `src/components/NicknameModal.tsx`
- `src/components/QuizModal.tsx`
- `src/components/RuleModal.tsx`
- `src/components/SearchModal.tsx`
- `src/components/WordBookModal.tsx`
