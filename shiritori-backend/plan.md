# Shiritori Backend Improvement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 앱 전용 운영 품질을 높이기 위해 게임 턴 일관성, 타임아웃 API 계약, 인증 경계, 레이트리밋 응답 일관성을 보강한다.

**Architecture:** 기존 Spring API 구조(Controller-Service-Domain)는 유지하되, 도메인 불변성/트랜잭션 경계를 강화한다. 특히 게임 턴 쓰기 경로를 동시성 안전하게 만들고, 클라이언트와의 결합이 강한 `TIME_OVER_SIGNAL` 프로토콜을 명시적 REST 엔드포인트로 치환한다. 공통 에러 응답은 `ApiResponse` 형식으로 통일한다.

**Tech Stack:** Spring Boot 4, Spring Security JWT, Spring Data JPA, PostgreSQL, Bucket4j, JUnit5, SpringBootTest, MockMvc.

---

## Summary

- 산출 파일 목표: `/Users/wooseop-kim/workspaces/shiritori-game/shiritori-backend/plan.md`
- 적용 스킬: `@writing-plans`, `@systematic-debugging`
- 우선순위:
1. P0: 턴 번호 동시성/원자성 보장
2. P0: 타임아웃 API 계약 분리
3. P1: `/api/ranks/me` 인증 경계 고정
4. P1: 429 응답 형식 통일(JSON)
5. P1: 끝말 규칙 검증 테스트 보강

## Public API / Contract Changes

1. `POST /api/games/{gameId}/timeout` 추가
- 기존 클라이언트 magic word(`TIME_OVER_SIGNAL`) 의존 제거

2. `POST /api/games/{gameId}/turn` 계약 정리
- `TIME_OVER_SIGNAL` 입력을 타임오버 트리거로 해석하지 않음

3. `GET /api/ranks/me` 인증 필수화
- 비인증 요청 401

4. 레이트리밋 초과 응답 통일
- `text/plain` -> `ApiResponse.fail(429, ...)` JSON

---

### Task 1: 게임 턴 번호 동시성 안정화

**Files:**
- Modify: `shiritori-backend/src/main/java/hello/shiritori/domain/game/repository/GameRepository.java`
- Modify: `shiritori-backend/src/main/java/hello/shiritori/domain/game/service/GameService.java`
- Modify: `shiritori-backend/src/main/java/hello/shiritori/domain/gameTurn/repository/GameTurnRepository.java`
- Modify: `shiritori-backend/src/main/java/hello/shiritori/domain/gameTurn/service/GameTurnService.java`
- Modify: `shiritori-backend/src/main/java/hello/shiritori/domain/gameTurn/entity/GameTurn.java`
- Create: `shiritori-backend/src/test/java/hello/shiritori/domain/game/service/GameServiceConcurrencyTest.java`

**Step 1: Write the failing test**

```java
@Test
void concurrent_turn_saves_do_not_duplicate_turn_number() throws Exception {
    // same game에 대해 동시에 턴 저장 시도
    // then: turn_number가 중복되지 않아야 함
}
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-backend && ./gradlew test --tests "hello.shiritori.domain.game.service.GameServiceConcurrencyTest"`
Expected: FAIL (중복 turnNumber 또는 제약 없음)

**Step 3: Write minimal implementation**

- `GameRepository`에 `findByIdForUpdate`(`PESSIMISTIC_WRITE`) 추가
- `GameService`의 턴 변경 경로(`playTurn`, `passTurn`, `quitGame`)에서 잠금 조회 사용
- `GameTurnService`의 next turn 계산을 `countByGame` 기반에서 `findTopByGameOrderByTurnNumberDesc + 1`로 변경
- `GameTurn`에 `(game_id, turn_number)` unique constraint 추가

**Step 4: Run test to verify it passes**

Run: `cd shiritori-backend && ./gradlew test --tests "hello.shiritori.domain.game.service.GameServiceConcurrencyTest"`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-backend/src/main/java/hello/shiritori/domain/game/repository/GameRepository.java \
        shiritori-backend/src/main/java/hello/shiritori/domain/game/service/GameService.java \
        shiritori-backend/src/main/java/hello/shiritori/domain/gameTurn/repository/GameTurnRepository.java \
        shiritori-backend/src/main/java/hello/shiritori/domain/gameTurn/service/GameTurnService.java \
        shiritori-backend/src/main/java/hello/shiritori/domain/gameTurn/entity/GameTurn.java \
        shiritori-backend/src/test/java/hello/shiritori/domain/game/service/GameServiceConcurrencyTest.java

git commit -m "fix(back): harden turn ordering under concurrency"
```

---

### Task 2: 타임오버 계약을 전용 API로 분리

**Files:**
- Modify: `shiritori-backend/src/main/java/hello/shiritori/domain/game/controller/GameController.java`
- Modify: `shiritori-backend/src/main/java/hello/shiritori/domain/game/service/GameService.java`
- Modify: `shiritori-backend/src/main/java/hello/shiritori/domain/gameTurn/dto/TurnResponse.java`
- Modify: `shiritori-backend/src/test/java/hello/shiritori/domain/game/service/GameServiceTest.java`
- Create: `shiritori-backend/src/test/java/hello/shiritori/domain/game/controller/GameControllerTimeoutTest.java`

**Step 1: Write the failing test**

```java
@Test
void timeout_endpoint_finishes_game_as_time_over() throws Exception {
    mockMvc.perform(post("/api/games/{id}/timeout", gameId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.status").value("GAME_OVER"));
}
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-backend && ./gradlew test --tests "hello.shiritori.domain.game.controller.GameControllerTimeoutTest"`
Expected: FAIL (endpoint 없음)

**Step 3: Write minimal implementation**

- `POST /api/games/{gameId}/timeout` 컨트롤러 추가
- `GameService.timeoutGame(gameId)` 추가: `TIME_OVER`로 종료 + 응답 반환
- `playTurn`에서 `TIME_OVER_SIGNAL` 특수문자 처리 제거

**Step 4: Run test to verify it passes**

Run: `cd shiritori-backend && ./gradlew test --tests "hello.shiritori.domain.game.controller.GameControllerTimeoutTest" --tests "hello.shiritori.domain.game.service.GameServiceTest"`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-backend/src/main/java/hello/shiritori/domain/game/controller/GameController.java \
        shiritori-backend/src/main/java/hello/shiritori/domain/game/service/GameService.java \
        shiritori-backend/src/main/java/hello/shiritori/domain/gameTurn/dto/TurnResponse.java \
        shiritori-backend/src/test/java/hello/shiritori/domain/game/service/GameServiceTest.java \
        shiritori-backend/src/test/java/hello/shiritori/domain/game/controller/GameControllerTimeoutTest.java

git commit -m "feat(back): add explicit timeout endpoint for game"
```

---

### Task 3: `/api/ranks/me` 인증 경계 고정

**Files:**
- Modify: `shiritori-backend/src/main/java/hello/shiritori/global/config/SecurityConfig.java`
- Modify: `shiritori-backend/src/main/java/hello/shiritori/domain/ranking/controller/RankingController.java`
- Modify: `shiritori-backend/src/test/java/hello/shiritori/global/config/SecurityConfigAuthBoundaryTest.java`

**Step 1: Write the failing test**

```java
@Test
void unauthenticated_ranks_me_returns_401() throws Exception {
    mockMvc.perform(get("/api/ranks/me"))
        .andExpect(status().isUnauthorized());
}
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-backend && ./gradlew test --tests "hello.shiritori.global.config.SecurityConfigAuthBoundaryTest"`
Expected: FAIL (`/api/ranks/me` permitAll)

**Step 3: Write minimal implementation**

- `SecurityConfig`에 `/api/ranks/me` 인증 필수 matcher 추가
- `RankingController.getMyBestRank`의 `jwt == null` 분기 제거

**Step 4: Run test to verify it passes**

Run: `cd shiritori-backend && ./gradlew test --tests "hello.shiritori.global.config.SecurityConfigAuthBoundaryTest"`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-backend/src/main/java/hello/shiritori/global/config/SecurityConfig.java \
        shiritori-backend/src/main/java/hello/shiritori/domain/ranking/controller/RankingController.java \
        shiritori-backend/src/test/java/hello/shiritori/global/config/SecurityConfigAuthBoundaryTest.java

git commit -m "fix(back): require auth for /api/ranks/me"
```

---

### Task 4: 레이트리밋 429 응답 형식 표준화

**Files:**
- Modify: `shiritori-backend/src/main/java/hello/shiritori/global/interceptor/RateLimitInterceptor.java`
- Modify: `shiritori-backend/src/main/java/hello/shiritori/global/config/WebMvcConfig.java`
- Create: `shiritori-backend/src/test/java/hello/shiritori/global/interceptor/RateLimitInterceptorTest.java`

**Step 1: Write the failing test**

```java
@Test
void rate_limit_exceeded_returns_api_response_json() throws Exception {
    // burst 초과 요청 후
    mockMvc.perform(post("/api/games/{id}/turn", gameId))
        .andExpect(status().isTooManyRequests())
        .andExpect(jsonPath("$.code").value(429));
}
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-backend && ./gradlew test --tests "hello.shiritori.global.interceptor.RateLimitInterceptorTest"`
Expected: FAIL (현재 plain text)

**Step 3: Write minimal implementation**

- 초과 시 `response.getWriter().write(...)` plain text 제거
- `ApiResponse.fail(HttpStatus.TOO_MANY_REQUESTS, "...")` JSON으로 응답
- `Content-Type: application/json` 보장

**Step 4: Run test to verify it passes**

Run: `cd shiritori-backend && ./gradlew test --tests "hello.shiritori.global.interceptor.RateLimitInterceptorTest"`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-backend/src/main/java/hello/shiritori/global/interceptor/RateLimitInterceptor.java \
        shiritori-backend/src/main/java/hello/shiritori/global/config/WebMvcConfig.java \
        shiritori-backend/src/test/java/hello/shiritori/global/interceptor/RateLimitInterceptorTest.java

git commit -m "refactor(back): normalize rate-limit response to ApiResponse"
```

---

### Task 5: ShiritoriValidator 엣지 케이스 테스트 보강

**Files:**
- Create: `shiritori-backend/src/test/java/hello/shiritori/global/validator/ShiritoriValidatorTest.java`
- Modify: `shiritori-backend/src/main/java/hello/shiritori/global/validator/ShiritoriValidator.java` (필요 시 최소 수정)

**Step 1: Write the failing test**

```java
@ParameterizedTest
@CsvSource({
  "じゅ,しゅ,true",
  "スーパー,ぱん,true",
  "きゃ,やま,false"
})
void validates_expected_connection_rules(...) { ... }
```

**Step 2: Run test to verify it fails**

Run: `cd shiritori-backend && ./gradlew test --tests "hello.shiritori.global.validator.ShiritoriValidatorTest"`
Expected: FAIL (현재 규칙 누락 케이스 발견 가능)

**Step 3: Write minimal implementation**

- 실패 케이스가 실제 버그일 때만 `ShiritoriValidator` 최소 수정
- 기존 통과 케이스 회귀 방지

**Step 4: Run test to verify it passes**

Run: `cd shiritori-backend && ./gradlew test --tests "hello.shiritori.global.validator.ShiritoriValidatorTest" && ./gradlew test`
Expected: PASS

**Step 5: Commit**

```bash
git add shiritori-backend/src/test/java/hello/shiritori/global/validator/ShiritoriValidatorTest.java \
        shiritori-backend/src/main/java/hello/shiritori/global/validator/ShiritoriValidator.java

git commit -m "test(back): add shiritori validator edge-case coverage"
```

---

## Final Acceptance Checklist

1. 동시 요청에서도 `game_turns.turn_number` 중복 없음
2. 타임아웃은 전용 endpoint만 사용
3. `/api/ranks/me` 비인증 401 고정
4. 턴 레이트리밋 초과 시 JSON 형식 응답
5. validator edge test 신규 통과 + 전체 테스트 green

## Assumptions

1. DB 마이그레이션은 JPA DDL 대신 SQL migration(Flyway/Liquibase 또는 수동 SQL)으로 적용한다.
2. 모바일 클라이언트는 `timeout` endpoint로 변경 가능하다.
3. `/api/ranks` 공개 조회 정책은 유지한다.

## Execution Handoff

Plan complete and prepared for `/Users/wooseop-kim/workspaces/shiritori-game/shiritori-backend/plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints
