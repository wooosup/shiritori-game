# GamePage/WordBook/Ranking UX Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** GamePage의 시각 완성도를 높이고, 단어장/랭킹을 모달에서 페이지로 전환해 탭 UX를 앱다운 구조로 정리한다.

**Architecture:** 기존 `HashRouter` 기반 구조를 유지하면서 `/wordbook`, `/ranking` 라우트를 추가한다. 데이터 fetch 로직은 현재 API 계약을 그대로 사용하고, UI 레벨에서 공통 레이아웃(헤더/탭/상태 UI)을 재사용하도록 컴포넌트를 분리한다. 퀴즈는 홈에서 즉시 실행 가능한 모달로 유지해 빠른 학습 루프를 보존한다.

**Tech Stack:** React 19, React Router, Tailwind, Axios, Supabase Auth, Vitest, Testing Library, Capacitor (Android runtime)

**Applied skills:** @frontend-design, @systematic-debugging, @playwright

---

### Task 1: 라우팅 목표를 테스트로 먼저 고정

**Files:**
- Create: `shiritori-frontend/src/App.navigation.test.tsx`
- Modify: `shiritori-frontend/src/App.tsx`
- Test: `shiritori-frontend/src/App.navigation.test.tsx`

**Step 1: Write the failing test**

```tsx
it('renders WordBook page on #/wordbook', async () => {
  window.location.hash = '#/wordbook';
  render(<App />);
  expect(await screen.findByText('나만의 단어장')).toBeInTheDocument();
});

it('renders Ranking page on #/ranking', async () => {
  window.location.hash = '#/ranking';
  render(<App />);
  expect(await screen.findByText('랭킹')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && npm run test:run -- src/App.navigation.test.tsx`
Expected: FAIL (`/wordbook`, `/ranking` 라우트 미존재)

**Step 3: Write minimal implementation**

`App.tsx`에 신규 라우트 추가:

```tsx
<Route path="/wordbook" element={<WordBookPage />} />
<Route path="/ranking" element={<RankingPage />} />
```

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && npm run test:run -- src/App.navigation.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/src/App.navigation.test.tsx shiritori-frontend/src/App.tsx
git commit -m "test(router): 단어장과 랭킹 페이지 라우트 스모크 테스트 추가"
```

---

### Task 2: WordBook 페이지 골격 생성 (모달 → 페이지 전환 1)

**Files:**
- Create: `shiritori-frontend/src/pages/WordBookPage.tsx`
- Modify: `shiritori-frontend/src/pages/Home.tsx`
- Modify: `shiritori-frontend/src/components/WordBookModal.tsx`
- Test: `shiritori-frontend/src/App.navigation.test.tsx`

**Step 1: Write the failing test**

`App.navigation.test.tsx`에 단어장 핵심 UI 검증 추가:

```tsx
it('wordbook page shows add input and list header', async () => {
  window.location.hash = '#/wordbook';
  render(<App />);
  expect(await screen.findByPlaceholderText('단어를 추가하세요')).toBeInTheDocument();
  expect(screen.getByText('나만의 단어장')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && npm run test:run -- src/App.navigation.test.tsx`
Expected: FAIL (신규 페이지 미구현)

**Step 3: Write minimal implementation**

1. `WordBookModal` 내부 로직을 `WordBookPage`에서 재사용할 수 있게 분리.
2. `WordBookPage`는 풀페이지 컨테이너 + 기존 단어장 본문 렌더.
3. `Home.tsx` 하단 탭 `단어장` 클릭 시 `navigate('/wordbook')`.

```tsx
// Home.tsx
onClick={() => navigate('/wordbook')}
```

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && npm run test:run -- src/App.navigation.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/src/pages/WordBookPage.tsx shiritori-frontend/src/pages/Home.tsx shiritori-frontend/src/components/WordBookModal.tsx
git commit -m "feat(wordbook): 단어장 모달을 페이지 진입 구조로 확장"
```

---

### Task 3: Ranking 페이지 골격 생성 (모달 → 페이지 전환 2)

**Files:**
- Create: `shiritori-frontend/src/pages/RankingPage.tsx`
- Modify: `shiritori-frontend/src/pages/Home.tsx`
- Modify: `shiritori-frontend/src/components/RankingModal.tsx`
- Test: `shiritori-frontend/src/App.navigation.test.tsx`

**Step 1: Write the failing test**

`App.navigation.test.tsx`에 랭킹 핵심 UI 검증 추가:

```tsx
it('ranking page renders leaderboard title and empty state', async () => {
  window.location.hash = '#/ranking';
  render(<App />);
  expect(await screen.findByText('랭킹')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && npm run test:run -- src/App.navigation.test.tsx`
Expected: FAIL (신규 페이지 미구현)

**Step 3: Write minimal implementation**

1. `RankingModal` 뷰 로직을 페이지에서도 재사용 가능한 형태로 분리.
2. `RankingPage` 생성 후 홈 탭에서 `navigate('/ranking')` 연결.
3. 기존 `RankingModal`은 퀵 뷰 용도(필요 시 유지) 또는 내부 공용 컴포넌트 래퍼로 축소.

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && npm run test:run -- src/App.navigation.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/src/pages/RankingPage.tsx shiritori-frontend/src/pages/Home.tsx shiritori-frontend/src/components/RankingModal.tsx
git commit -m "feat(ranking): 랭킹 모달을 페이지 기반 구조로 확장"
```

---

### Task 4: 하단 탭 공통 컴포넌트화 및 활성 상태 정합성 개선

**Files:**
- Create: `shiritori-frontend/src/components/BottomTabBar.tsx`
- Modify: `shiritori-frontend/src/pages/Home.tsx`
- Modify: `shiritori-frontend/src/pages/WordBookPage.tsx`
- Modify: `shiritori-frontend/src/pages/RankingPage.tsx`
- Test: `shiritori-frontend/src/App.navigation.test.tsx`

**Step 1: Write the failing test**

```tsx
it('highlights active tab based on current route', async () => {
  window.location.hash = '#/ranking';
  render(<App />);
  const rankingTab = await screen.findByRole('button', { name: '랭킹' });
  expect(rankingTab).toHaveAttribute('aria-current', 'page');
});
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && npm run test:run -- src/App.navigation.test.tsx`
Expected: FAIL (`aria-current`/활성 탭 상태 미정의)

**Step 3: Write minimal implementation**

```tsx
<BottomTabBar current="ranking" onNavigate={navigate} />
```

- 탭 버튼에 `aria-current={active ? 'page' : undefined}` 적용.
- 아이콘 색상은 활성/비활성 모두 컬러 시스템으로 유지(흑백 금지).

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && npm run test:run -- src/App.navigation.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/src/components/BottomTabBar.tsx shiritori-frontend/src/pages/Home.tsx shiritori-frontend/src/pages/WordBookPage.tsx shiritori-frontend/src/pages/RankingPage.tsx
git commit -m "refactor(nav): 하단 탭 공통화와 활성 상태 접근성 개선"
```

---

### Task 5: GamePage 상단 상태 스트립/시스템 메시지 계층 개선

**Files:**
- Modify: `shiritori-frontend/src/pages/GamePage.tsx`
- Modify: `shiritori-frontend/src/pages/GamePage.css`
- Create: `shiritori-frontend/src/pages/GamePage.ui.test.tsx`
- Test: `shiritori-frontend/src/pages/GamePage.ui.test.tsx`

**Step 1: Write the failing test**

```tsx
it('renders status strip with level, pass, score labels', () => {
  render(<GamePage />);
  expect(screen.getByText('난이도')).toBeInTheDocument();
  expect(screen.getByText('PASS')).toBeInTheDocument();
  expect(screen.getByText('점수')).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && npm run test:run -- src/pages/GamePage.ui.test.tsx`
Expected: FAIL (테스트 파일/렌더 셋업 미구현)

**Step 3: Write minimal implementation**

1. 상단 스트립 spacing/배지 대비 강화.
2. AI 시스템 메시지(`msg.message`)를 일반 말풍선과 분리된 `system-chip` 스타일로 렌더.
3. 타이머 위험 구간 대비(다크모드 포함) 튜닝.

```tsx
{msg.message && <div className="system-chip">{msg.message}</div>}
```

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && npm run test:run -- src/pages/GamePage.ui.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/src/pages/GamePage.tsx shiritori-frontend/src/pages/GamePage.css shiritori-frontend/src/pages/GamePage.ui.test.tsx
git commit -m "feat(game-ui): 상태 스트립과 시스템 메시지 시각 계층 강화"
```

---

### Task 6: WordBook/Ranking 페이지 상태 UI(로딩/빈상태/오류) 정규화

**Files:**
- Create: `shiritori-frontend/src/components/InlineState.tsx`
- Modify: `shiritori-frontend/src/pages/WordBookPage.tsx`
- Modify: `shiritori-frontend/src/pages/RankingPage.tsx`
- Test: `shiritori-frontend/src/App.navigation.test.tsx`

**Step 1: Write the failing test**

```tsx
it('shows retry action when ranking fetch fails', async () => {
  window.location.hash = '#/ranking';
  render(<App />);
  expect(await screen.findByRole('button', { name: '다시 시도' })).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && npm run test:run -- src/App.navigation.test.tsx`
Expected: FAIL (상태 UI 규칙 미고정)

**Step 3: Write minimal implementation**

- 공통 상태 컴포넌트 작성:

```tsx
<InlineState type="error" message="랭킹을 불러오지 못했어요." actionLabel="다시 시도" onAction={refetch} />
```

- WordBook/Ranking 페이지에서 로딩/빈/오류 표시 통일.

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && npm run test:run -- src/App.navigation.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/src/components/InlineState.tsx shiritori-frontend/src/pages/WordBookPage.tsx shiritori-frontend/src/pages/RankingPage.tsx shiritori-frontend/src/App.navigation.test.tsx
git commit -m "refactor(ui): 단어장과 랭킹 페이지 상태 표시 컴포넌트 통일"
```

---

### Task 7: 퀴즈 모달 완성도 보강(빠른 루프 유지)

**Files:**
- Modify: `shiritori-frontend/src/components/QuizModal.tsx`
- Modify: `shiritori-frontend/src/pages/Home.tsx`
- Test: `shiritori-frontend/src/App.navigation.test.tsx`

**Step 1: Write the failing test**

```tsx
it('opens quiz modal from home quick action', async () => {
  window.location.hash = '#/';
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: '퀴즈' }));
  expect(await screen.findByText(/문제 1\//)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-frontend && npm run test:run -- src/App.navigation.test.tsx`
Expected: FAIL (퀴즈 진입 검증 미정의)

**Step 3: Write minimal implementation**

- 퀴즈 모달에 진행 헤더/닫기/완료 CTA 명확화.
- Home의 퀴즈 진입 버튼 라벨/터치 영역 개선.

**Step 4: Run test to verify it passes**

Run: `cd shiritori-frontend && npm run test:run -- src/App.navigation.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/src/components/QuizModal.tsx shiritori-frontend/src/pages/Home.tsx shiritori-frontend/src/App.navigation.test.tsx
git commit -m "feat(quiz): 홈 퀵 액션 기반 퀴즈 모달 완성도 개선"
```

---

### Task 8: 최종 회귀 검증 + 문서 갱신

**Files:**
- Modify: `shiritori-frontend/README.md`
- Modify: `docs/plans/2026-03-02-gamepage-wordbook-ranking-design.md` (필요 시 구현 반영 노트)
- Test: frontend full checks

**Step 1: Write the failing check list**

- README에 라우트 정보(`/wordbook`, `/ranking`)가 없어 최신 구조와 불일치.

**Step 2: Run verification to confirm gaps**

Run: 
- `cd shiritori-frontend && npm run lint`
- `cd shiritori-frontend && npm run test:run`
- `cd shiritori-frontend && npm run build`
Expected: 코드 통과 + 문서 갱신 필요사항 확인

**Step 3: Write minimal documentation update**

README에 다음 반영:
- 탭 구조: 홈/단어장/퀴즈/랭킹/옵션
- 페이지 라우트: `/`, `/wordbook`, `/ranking`, `/game`
- 퀴즈는 모달 방식 유지

**Step 4: Run final verification**

Run:
- `cd shiritori-frontend && npm run lint && npm run test:run && npm run build`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-frontend/README.md docs/plans/2026-03-02-gamepage-wordbook-ranking-design.md
git commit -m "docs(front): 균형형 탭 구조와 라우팅 변경 내용 문서화"
```

---

## Test Cases and Scenarios (인수 기준)

1. 라우팅
- `#/wordbook` 진입 시 단어장 페이지가 렌더되고 하단 탭 활성 상태가 단어장으로 표시된다.
- `#/ranking` 진입 시 랭킹 페이지가 렌더되고 하단 탭 활성 상태가 랭킹으로 표시된다.

2. GamePage 시각 계층
- 상단 스트립에서 난이도/PASS/점수가 동시에 가독성 있게 보인다.
- 시스템 메시지(PASS, 안내)가 일반 대화 말풍선과 구분된다.

3. 퀴즈
- 홈에서 퀴즈를 열고 닫는 흐름이 단일 루프로 동작한다.

4. 회귀
- 로그인/닉네임/랭킹/단어장 API 호출 흐름이 기존과 동일하게 동작한다.

## Assumptions and Defaults

1. 라우터는 `HashRouter`를 유지한다.
2. 퀴즈는 페이지 분리하지 않고 모달 구조를 유지한다.
3. GamePage 도메인 로직(턴/점수/PASS)은 이번 범위에서 변경하지 않는다.
4. Android 앱 우선 정책을 유지한다(iOS 배포 재도입 없음).

## Execution Handoff

Plan complete and prepared for `docs/plans/2026-03-02-gamepage-wordbook-ranking-implementation.md`.

Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints
