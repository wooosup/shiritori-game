# Shiritori Frontend Improvement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 앱 퍼스트 UX를 강화하기 위해 인증 흐름 단순화, 타임아웃 계약 정렬, 효과음 제어, 에러 복원력, 게임 화면 유지보수성을 개선한다.

**Architecture:** 기존 React + HashRouter + Capacitor 구조는 유지하고, 홈/게임 화면의 상태 로직을 분리한다. 백엔드 API 계약 변경(타임아웃 endpoint)을 프론트에 반영하고, 오디오/에러 처리를 재사용 가능한 유틸로 통합한다. 고장 모드(네트워크 실패/부분 실패)에서 사용자 경험이 끊기지 않도록 degrade 전략을 명시한다.

**Tech Stack:** React 19, TypeScript, Vite 7, React Router 7, Axios, Supabase Auth, Capacitor 7, TailwindCSS, Vitest, Testing Library.

---

## Summary

- 산출 파일 목표: `/Users/wooseop-kim/workspaces/shiritori-game/shiritori-frontend/plan.md`
- 적용 스킬: `@writing-plans`, `@systematic-debugging`, `@frontend-design`
- 우선순위:
1. P0: 타임아웃 API 계약 동기화
2. P0: 전역 효과음 품질/제어(뮤트 포함)
3. P1: Home 부분 실패 복원력
4. P1: dead auth modal 경로 정리
5. P2: GamePage 스타일 분리(유지보수)

## Public UI / Runtime Changes

1. 타임오버 처리
- `TIME_OVER_SIGNAL` 전송 제거
- `POST /games/{id}/timeout` 호출로 변경

2. 효과음 동작 규칙
- 모든 버튼 클릭 시 `poka01.mp3`
- 게임 입력 오류 시 `blip03.mp3`
- 사용자 설정(`SFX ON/OFF`) 추가 및 로컬 저장

3. 홈 화면 로딩 실패 대응
- count/rank/banner 실패를 각각 표시하고 개별 재시도 제공

4. 로그인 모달 경로 정리
- 현재 미사용 `LoginModal` 루트 경로 제거 또는 명시적 트리거 연결 중 하나로 확정

---

### Task 1: 타임아웃 API 계약 반영 (프론트)

**Files:**
- Modify: `shiritori-frontend/src/pages/GamePage.tsx`
- Create: `shiritori-frontend/src/pages/GamePage.timeout.test.tsx`

**Step 1: Write the failing test**

```ts
it('sends timeout request to /games/:id/timeout', async () => {
  // timer 0 도달 시 /turn(TIME_OVER_SIGNAL) 대신 /timeout 호출 검증
});
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && npm run test -- src/pages/GamePage.timeout.test.tsx --run`
Expected: FAIL (현재 `/turn` + `TIME_OVER_SIGNAL` 호출)

**Step 3: Write minimal implementation**

- `handleTimeOver()`에서 `/games/${gameId}/timeout` 호출
- magic string 제거

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && npm run test -- src/pages/GamePage.timeout.test.tsx --run`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/src/pages/GamePage.tsx \
        shiritori-frontend/src/pages/GamePage.timeout.test.tsx

git commit -m "refactor(front): align game timeout flow with backend endpoint"
```

---

### Task 2: 효과음 시스템 고도화 (뮤트/중복재생 제어)

**Files:**
- Modify: `shiritori-frontend/src/sound/effects.ts`
- Create: `shiritori-frontend/src/sound/effects.test.ts`
- Create: `shiritori-frontend/src/stores/settingsStore.ts`
- Modify: `shiritori-frontend/src/pages/Home.tsx`
- Modify: `shiritori-frontend/src/App.tsx`

**Step 1: Write the failing test**

```ts
it('does not play sfx when sfx setting is disabled', () => {
  // sfx off 상태에서 playButtonSfx 호출해도 play 미호출
});
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && npm run test -- src/sound/effects.test.ts --run`
Expected: FAIL (현재 mute 설정 없음)

**Step 3: Write minimal implementation**

- `settingsStore`에 `sfxEnabled` + `toggleSfx()` + localStorage 연동
- `effects.ts`에서 재생 전 `sfxEnabled` 검사
- 빠른 연타 중첩 억제를 위한 최소 간격(throttle 50~80ms) 적용
- `Home` 헤더에 간단한 `SFX ON/OFF` 토글 버튼 추가

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && npm run test -- src/sound/effects.test.ts --run`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/src/sound/effects.ts \
        shiritori-frontend/src/sound/effects.test.ts \
        shiritori-frontend/src/stores/settingsStore.ts \
        shiritori-frontend/src/pages/Home.tsx \
        shiritori-frontend/src/App.tsx

git commit -m "feat(front): add controllable sfx settings and playback guard"
```

---

### Task 3: Home 초기 로딩 부분 실패 복원력 강화

**Files:**
- Modify: `shiritori-frontend/src/pages/Home.tsx`
- Create: `shiritori-frontend/src/pages/Home.bootstrap.test.tsx`

**Step 1: Write the failing test**

```ts
it('shows retry action when ranks request fails but renders other sections', async () => {
  // /ranks 실패, /words/count 성공 시 부분 렌더 + 랭킹 재시도 버튼 노출
});
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && npm run test -- src/pages/Home.bootstrap.test.tsx --run`
Expected: FAIL (현재 실패 상태 표시/재시도 UX 약함)

**Step 3: Write minimal implementation**

- count/rank/banner를 독립 상태로 분리 (`data`, `loading`, `error`)
- 각 섹션에 경량 에러 UI + 개별 retry 버튼 추가
- 전체 앱 사용은 유지(전체 hard fail 금지)

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && npm run test -- src/pages/Home.bootstrap.test.tsx --run`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/src/pages/Home.tsx \
        shiritori-frontend/src/pages/Home.bootstrap.test.tsx

git commit -m "feat(front): add resilient partial-failure handling on home bootstrap"
```

---

### Task 4: Dead Auth Modal 경로 제거 또는 활성화 결정 반영

**Files:**
- Modify: `shiritori-frontend/src/App.tsx`
- Modify: `shiritori-frontend/src/stores/authStore.ts`
- Delete: `shiritori-frontend/src/components/LoginModal.tsx` (제거 선택 시)
- Modify: `shiritori-frontend/src/App.router.test.tsx`

**Step 1: Write the failing test**

```ts
it('does not mount unused login modal path', () => {
  // root render 시 사용되지 않는 login modal import/렌더 경로가 없어야 함
});
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && npm run test -- src/App.router.test.tsx --run`
Expected: FAIL (현재 App 루트에 조건부 modal 경로 존재)

**Step 3: Write minimal implementation**

- 로그인 시작은 `Home`의 native OAuth 버튼 경로만 사용하도록 단일화
- `authStore`에서 미사용 modal state/actions 제거
- `LoginModal` 컴포넌트 제거(또는 명시적 사용처 추가 중 하나를 택일)

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && npm run test -- src/App.router.test.tsx --run`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/src/App.tsx \
        shiritori-frontend/src/stores/authStore.ts \
        shiritori-frontend/src/App.router.test.tsx

git rm shiritori-frontend/src/components/LoginModal.tsx

git commit -m "refactor(front): remove dead login modal path and simplify auth store"
```

---

### Task 5: GamePage 스타일 분리 및 회귀 방지

**Files:**
- Modify: `shiritori-frontend/src/pages/GamePage.tsx`
- Create: `shiritori-frontend/src/pages/GamePage.css`
- Create: `shiritori-frontend/src/pages/GamePage.styles.test.tsx`

**Step 1: Write the failing test**

```ts
it('keeps critical game UI classes after style extraction', () => {
  // score/combo/timer/input 핵심 selector 존재 검증
});
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && npm run test -- src/pages/GamePage.styles.test.tsx --run`
Expected: FAIL (스타일 분리 전 테스트 없음)

**Step 3: Write minimal implementation**

- 인라인 `<style>` 블록을 `GamePage.css`로 이동
- 컴포넌트에서 CSS import
- 시각 동작(shake/bounce/fade/slide) class 이름 유지

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && npm run test -- src/pages/GamePage.styles.test.tsx --run && npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/src/pages/GamePage.tsx \
        shiritori-frontend/src/pages/GamePage.css \
        shiritori-frontend/src/pages/GamePage.styles.test.tsx

git commit -m "refactor(front): extract GamePage inline styles into css module"
```

---

### Task 6: 문서/릴리즈 체크리스트 업데이트

**Files:**
- Modify: `shiritori-frontend/README.md`
- Modify: `shiritori-frontend/docs/internal-testing-release.md`
- Modify: `shiritori-frontend/docs/release-mobile.md`

**Step 1: Write the failing test**

```bash
# docs lint 또는 수동 검증 기준:
# timeout API 경로/효과음 설정/테스트 실행 순서가 문서에 없으면 실패
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && rg -n "timeout|SFX|blip03|poka01" README.md docs/*.md`
Expected: 일부 키워드 누락

**Step 3: Write minimal implementation**

- 타임아웃 API 변경 반영
- 효과음 파일 위치/규칙/뮤트 토글 설명
- 로컬 검증 명령(테스트/빌드/sync) 명시

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && rg -n "timeout|SFX|blip03|poka01" README.md docs/*.md`
Expected: 모든 문서에 핵심 절차 반영

**Step 5: Commit**

```bash
git add shiritori-frontend/README.md \
        shiritori-frontend/docs/internal-testing-release.md \
        shiritori-frontend/docs/release-mobile.md

git commit -m "docs(front): update mobile gameplay and sfx operational guide"
```

---

## Final Acceptance Checklist

1. 타임오버가 `/timeout` endpoint로만 처리됨
2. 모든 버튼 클릭 시 `poka01.mp3` 재생, 게임 입력 오류 시 `blip03.mp3` 재생
3. `SFX ON/OFF` 토글로 사운드 즉시 제어 가능
4. Home 일부 API 실패 시에도 앱이 동작하며 섹션별 재시도 가능
5. dead login modal 경로 제거로 인증 흐름 단순화
6. GamePage 스타일 분리 후 시각 회귀 없음

## Assumptions

1. `blip03.mp3`, `poka01.mp3`는 `public/` 루트 경로(`/blip03.mp3`, `/poka01.mp3`)로 로드한다.
2. 백엔드가 `POST /games/{gameId}/timeout`를 제공한다.
3. 앱 스토어 배포 전 단계에서는 SFX 파일 용량 최적화는 후속 작업으로 둔다.

## Execution Handoff

Plan complete and prepared for `/Users/wooseop-kim/workspaces/shiritori-game/shiritori-frontend/plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints
