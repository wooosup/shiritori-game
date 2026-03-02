# Shiritori Backend Research

작성 시각: 2026-02-28 14:41 KST
대상 범위: `shiritori-backend/` 전체 (빌드/설정/애플리케이션 코드/테스트/리소스)

## 1. 한눈에 보는 백엔드

이 백엔드는 Spring Boot 4 기반 REST API 서버이며, 핵심 기능은 다음 5개 도메인으로 구성된다.

1. 게임 세션 시작/턴 진행/패스/포기 (`/api/games/**`)
2. 사용자 프로필/닉네임 (`/api/profiles/**`)
3. 단어 사전 조회 (`/api/words/**`)
4. 단어장/퀴즈 (`/api/wordBooks/**`)
5. 랭킹 조회 (`/api/ranks`)

핵심 특징:

- JWT Resource Server(Supabase JWK) 기반 인증
- JPA + PostgreSQL
- 게임 규칙 검증(탁음/반탁음/요음/장음 처리)
- AI 단어 선택은 DB 랜덤 쿼리 기반
- 게임 턴 API에 IP 단위 Rate Limit(10 req burst + 1 req/sec refill)
- CSV 기반 초기 단어 데이터 적재

## 2. 기술 스택/빌드/런타임

### 2.1 빌드 및 런타임

- Java 21 (`build.gradle` toolchain)
- Spring Boot `4.0.2`
- Spring Dependency Management `1.1.7`
- Gradle Wrapper 포함

### 2.2 주요 의존성

- `spring-boot-starter-webmvc`
- `spring-boot-starter-data-jpa`
- `spring-boot-starter-security`
- `spring-boot-starter-oauth2-resource-server`
- `spring-boot-starter-validation`
- PostgreSQL 드라이버 (`runtimeOnly`)
- H2 (`runtimeOnly`, 테스트용)
- OpenCSV (`com.opencsv:opencsv:5.9`)
- Bucket4j (`com.bucket4j:bucket4j-core:8.9.0`)

### 2.3 앱 부트 동작

- `@EnableJpaAuditing`: `BaseEntity.createdAt` 자동 주입
- `@EnableScheduling`: DB warm-up 스케줄러 활성화
- `@PostConstruct`: 기본 타임존 `Asia/Seoul` 고정

## 3. 설정값 및 환경변수

`src/main/resources/application.properties` 기준.

### 3.1 필수 환경변수

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `SUPABASE_JWT_URI`

### 3.2 DB/JPA 설정

- `spring.jpa.hibernate.ddl-auto=none` (스키마 자동 생성 안 함)
- 배치 최적화: batch_size=500, order_inserts/update=true
- Dialect: PostgreSQLDialect
- Hikari 연결 풀 + SSL/TCP keepalive + 타임아웃 설정

### 3.3 보안/로그/웜업

- Spring Security DEBUG 로그 활성화
- DB 웜업 기본 활성 (`app.db-warmup.enabled=true`)
- 웜업 기본 주기: initial delay 5초, fixed delay 60초

### 3.4 데이터 초기화

`DataInitService`는 `@ConditionalOnProperty(name="app.data-init.enabled", havingValue="true", matchIfMissing=true)` 이므로, 프로퍼티가 없으면 기본 실행된다.

- `app.data-init.upsert=false` 기본
- DB에 단어가 하나라도 있으면 스킵
- upsert 모드 true면 기존 단어도 업데이트 시도

## 4. 보안 구조

`global/config/SecurityConfig.java`

1. CORS 허용 Origin
   - `http://localhost:5173`
   - `https://shiritori-game-gold.vercel.app`
2. CSRF 비활성, Stateless 세션
3. 인증 필요 경로: `/api/games/**` 만 authenticated
4. 그 외 경로: permitAll
5. JWT 디코더: JWK Set URI + ES256 고정

중요 관찰:

- `/api/profiles/**`, `/api/wordBooks/**` 는 컨트롤러에서 `@AuthenticationPrincipal Jwt`를 사용하지만 보안 설정은 permitAll 이다.
- 비인증 요청 시 `jwt == null` 가능성이 있고, 곧바로 `jwt.getSubject()` 호출하면 NPE 위험이 있다.

## 5. 글로벌 공통 레이어

### 5.1 응답 포맷

`ApiResponse<T>`

- 표준 필드: `code`, `status`, `message`, `data`
- 성공: `ok(data)` 또는 `ok(message, data)`
- 실패: `fail(HttpStatus, message, data?)`

### 5.2 예외 처리

`ExceptionController` (`@RestControllerAdvice`)

- `MethodArgumentNotValidException` -> 400 + 필드별 에러 맵
- `ShiritoriException` -> 예외가 가진 HttpStatus 반환
- `IllegalArgumentException` -> 404
- 기타 `Exception` -> 500

도메인별 커스텀 예외:

- Game: `GameException`, `GameNotFound`, `GameAlreadyException`, `GameLevelException`
- User: `UserException`, `UserNotFound`
- Word: `WordException`, `WordNotFound`, `DuplicateWordException`
- WordBook: `WordBookException`, `WordBookNotFound`

### 5.3 인터셉터

`RateLimitInterceptor` + `WebMvcConfig`

- 적용 경로: `/api/games/**/turn`
- 식별 키: `request.getRemoteAddr()`
- 제한 정책: 버킷 용량 10, 초당 1 refill
- 초과 시 HTTP 429 + plain text `Too Many Requests`

### 5.4 초기화

- `DatabaseWarmupScheduler`: 주기적으로 `SELECT 1`
- `DataInitService`:
  - `data/output.csv`(22,885줄) 파싱
  - 기존 단어 맵 로딩 후 신규 insert / 기존 update
  - 500개 단위 `saveAll + flush`

### 5.5 일본어 유틸

`JapaneseUtils`

- 히라가나/가타카나 상호 변환
- 작은 글자 정규화(ゃ->や 등)
- 탁음/반탁음 청음화(が->か, ぱ->は)
- `endsWithN`, `isSmall`, `toSeion`

`ShiritoriValidator`

- 기본: 이전 단어 끝글자 정규화 == 현재 단어 시작글자 정규화
- 특수 허용:
  - 요음 결합 직접 연결 (`じゅ -> じゅ`)
  - 청음 기반 연결 (`じゅ -> しゅ`)

`WordFinder`

1. `findFirstByWord(input)` 우선
2. 실패 시 reading 기준 탐색
   - 히라가나 변환값
   - 가타카나 변환값

## 6. 도메인 상세

## 6.1 Game 도메인

### 엔티티 (`Game`)

필드:

- `id`, `user(Profile)`, `score`, `maxCombo`, `currentCombo`
- `status(GameStatus)`, `level(JlptLevel)`
- `lastTurnAt`, `endedAt`, `passCount`, `version(@Version)`

생성 규칙:

- `Game.create(profile, level)`
- 초기값: score=0, combo=0, status=PLAYING, passCount=3

상태 전이:

- 정답 시 `applyCorrectAnswer(level)`:
  - active 상태 검증
  - combo 증가 + maxCombo 갱신
  - 점수 계산
  - lastTurnAt 갱신
- 종료 시 `finish(status)`:
  - 이미 종료면 무시
  - status/endedAt 설정

점수 규칙:

- 기본(base): N1=100, N2=80, N3=50, 그 외/ALL/null=20
- 최종점수 증가량: `base + (currentCombo * 10)`
  - combo 증가 후 계산하므로 첫 정답도 +10 보너스가 붙음

타임아웃:

- `ChronoUnit.SECONDS` 기준 `seconds > limitSeconds`

### 서비스 (`GameService`)

상수:

- 제한시간 20초
- timeout signal: `TIME_OVER_SIGNAL`

#### `start(userId, request)`

1. 프로필 조회(없으면 UserNotFound)
2. 난이도 null 검증
3. 게임 생성 저장
4. 시작 단어 랜덤 조회(`findRandomStartWord`) 
5. AI 첫 턴 저장
6. `GameStartResponse` 반환

#### `playTurn(gameId, request)`

1. 게임 조회 + PLAYING 상태 검증
2. 사용자 입력 trim
3. timeout 또는 special signal -> 즉시 패배
4. 입력 자체가 `ん` 종료면 즉시 패배
5. WordFinder로 사전 단어 해석
6. 이전 단어와 연결 규칙 검증
7. 중복 사용 단어 검증
8. 유저 턴 저장 + 점수/콤보 반영
9. 유저 단어 ending `ん` 재검사
10. AI 응답 단어 탐색
    - 없으면 유저 WIN
    - 있으면 AI 턴 저장 후 PLAYING

#### `passTurn(gameId)`

1. 게임/상태 검증
2. 패스 잔여 횟수 검증
3. `passCount--`
4. 마지막 단어 기준 AI 단어 탐색
5. AI 턴 저장 + lastTurnAt 갱신
6. `TurnResponse.ofPass`

#### `quitGame(gameId)`

- PLAYING이면 GAME_OVER로 종료

### 컨트롤러 (`GameController`)

- `POST /api/games/start` (JWT subject를 UUID로 사용)
- `POST /api/games/{gameId}/turn`
- `POST /api/games/{gameId}/pass`
- `POST /api/games/{gameId}/quit`

주의:

- `playTurn`, `passTurn`, `quitGame`는 path gameId 사용
- `TurnRequest` 내부 `gameId`는 실질적으로 사용되지 않음

## 6.2 GameTurn 도메인

### 엔티티

- `GameTurn extends BaseEntity`
- `turnNumber`, `speaker(AI/USER)`, `wordText`

### 서비스

- `save`: 현재 게임 turn count + 1 계산
- `getLastWordOrThrow`: 가장 최근 턴의 wordText -> WordFinder 재해석
- `isWordAlreadyUsed`: 동일 game 내 단어 중복 검사

동시성 관찰:

- `countByGame + 1` 방식은 고동시성에서 turnNumber 충돌 가능성

## 6.3 Word 도메인

### 엔티티

- `Word(level, word, reading, meaning, startsWith, endsWith)`
- 생성/갱신 시 startsWith/endsWith 자동 계산
- 장음(ー) 처리:
  - 끝 글자면 직전 글자를 끝 글자로 사용
  - 시작 글자면 다음 글자를 시작 글자로 사용

### 리포지토리

- `findRandomStartWord(level)`:
  - 레벨 필터(null 허용)
  - `reading NOT LIKE '%ん'|'%ン'`
  - `ORDER BY random() LIMIT 1`
- `findAiWord(gameId, hira, kata, level)`:
  - starts_with가 hira/kata 중 하나
  - 이미 사용한 단어 제외(subquery game_turns)
  - ending `ん/ン` 제외
  - random 1개
- `findRandomWords(limit)` 등

### 서비스/컨트롤러

- `/api/words/count`: 전체 단어 수
- `/api/words/random`: 배너용 랜덤 10개
- `/api/words/search?keyword=`: 정확 일치 단어 검색

## 6.4 Profile 도메인

### 엔티티

- PK: UUID
- `nickname` unique
- `nicknameUpdatedAt`
- 닉네임 정책:
  - 공백/빈값 불가
  - 최대 10자
  - 마지막 변경 후 7일 cooldown

### 서비스

- `getMyProfile`: 없으면 profile 자동 생성
- `updateProfile`:
  - 존재 유저 필수
  - trim 처리
  - 동일 닉네임이면 중복 체크 생략
  - 타 유저 중복 닉네임 금지

### 컨트롤러

- `GET /api/profiles/me`
- `POST /api/profiles/nickname`

## 6.5 WordBook 도메인

### 엔티티

- `WordBook extends BaseEntity`
- `profile` + `word`
- 유니크 제약: `(user_id, word_id)`

### 서비스

- `save(userId, wordText)`:
  - 유저/단어 존재 검증
  - 중복 저장 방지
- `getWordBook(userId)`:
  - 최신순 조회 + word fetch join
- `quiz(userId)`:
  - 최근 10개 단어 기준 퀴즈 생성
  - 빈 단어장 예외
- `delete(userId, wordBookId)`:
  - 소유권 검증 후 삭제

### 퀴즈

`QuizType`

- `MEANING`: question=단어, options=뜻
- `WORD`: question=뜻, options=단어
- 랜덤 3개 오답 + 정답 1개 섞기

오타 관찰:

- 메서드 파라미터 `corrcetWord` 오탈자(동작 영향 없음)

### 컨트롤러

- `POST /api/wordBooks`
- `GET /api/wordBooks`
- `GET /api/wordBooks/quiz`
- `DELETE /api/wordBooks/{wordBookId}`

## 6.6 Ranking 도메인

### 엔티티/리포지토리

- 읽기 전용 view/entity: `ranking_board`
- native query로 닉네임별 최고 score 1개 추출 후 상위 10

### 컨트롤러

- `GET /api/ranks`

## 7. DB 모델/ERD 교차 확인

ERD(`src/main/resources/static/erd.png`)와 엔티티를 비교한 결과:

- 핵심 테이블 관계는 코드와 일치
  - `games.user_id -> profiles.id`
  - `game_turns.game_id -> games.id`
  - `word_book.user_id -> profiles.id`
  - `word_book.word_id -> game_words.id`
- 차이점/주의점
  - ERD의 `profiles.avatar_url`은 현재 `Profile` 엔티티에 없음
  - ERD의 `games.created_at`은 `Game` 엔티티에 없음(BaseEntity 미상속)
  - 코드상 `Profile.nickname` 길이 제한은 엔티티 컬럼 20, 도메인 검증 10

## 8. API 요약

### 인증 요구

- 보안 설정상 `/api/games/**`만 강제 인증
- 실제로는 `/api/profiles/**`, `/api/wordBooks/**`도 사실상 인증 필요(JWT subject 사용)

### 헬스체크

- `GET /api/healthz`
- `GET /api/healthz/db`

### 게임

- `POST /api/games/start`
- `POST /api/games/{gameId}/turn`
- `POST /api/games/{gameId}/pass`
- `POST /api/games/{gameId}/quit`

### 기타

- `GET /api/ranks`
- `GET /api/words/count`
- `GET /api/words/random`
- `GET /api/words/search`
- `GET/POST /api/profiles/*`
- `GET/POST/DELETE /api/wordBooks/*`

## 9. 테스트 분석

테스트 파일:

- `ShiritoriApplicationTests`: context load
- `GameTest`: 점수/콤보/종료/타임아웃
- `GameServiceTest`: 턴 진행, ALL 레벨 시작 단어
- `ProfileServiceTest`: trim/중복 닉네임
- `WordTest`: 시작/끝 글자 계산, 장음/ん 처리
- `WordBookServiceTest`: 저장/중복/조회/삭제/권한

강점:

- 도메인 핵심 규칙(점수, 닉네임, 단어장 중복, 장음)은 기본 검증됨

부족한 영역:

- 보안(인증/인가) 통합 테스트 부재
- 컨트롤러 계약 테스트 부재
- `ShiritoriValidator` 특수 규칙 테스트 부재
- Race condition/동시성 테스트 부재

## 10. 운영 관점 리스크 및 개선 포인트

1. 인증 경계 불일치
   - 보안 설정과 컨트롤러 기대사항이 달라 NPE/500 유발 가능
2. 프론트 입력 `TIME_OVER_SIGNAL` 의존
   - 프로토콜 결합 강함, 공개 API 악용 가능성 존재
3. GET 이외 재시도 정책 없음
   - 프론트가 POST 실패 복구를 직접 책임
4. Turn 번호 계산 경쟁 상태 가능
   - 고동시성 시 중복 번호 가능
5. `findTopByReadingOrderByLevelDesc`의 enum 정렬 의미 검토 필요
   - 문자열 정렬이라 난이도 우선도가 의도와 다를 수 있음

## 11. 파일 인덱스 (역할 기준)

### 빌드/설정

- `build.gradle`: 의존성/플러그인/테스트 설정
- `settings.gradle`: 프로젝트 이름
- `Dockerfile`: 컨테이너 빌드
- `gradlew`, `gradlew.bat`, `gradle/wrapper/*`: wrapper
- `src/main/resources/application.properties`: 런타임 설정

### 엔트리/공통

- `ShiritoriApplication.java`: 앱 부트
- `domain/common/BaseEntity.java`: createdAt 감사 필드
- `global/api/ApiResponse.java`: 공통 응답 형식

### global/config

- `SecurityConfig.java`: JWT/CORS/인가 규칙
- `WebMvcConfig.java`: 인터셉터 등록

### global/controller

- `ExceptionController.java`: 예외 매핑
- `HealthController.java`: 헬스체크

### global/exception

- `ShiritoriException.java`: 베이스 예외
- 하위 도메인 예외 11종

### global/init

- `DatabaseWarmupScheduler.java`: DB warmup
- `DataInitService.java`: CSV seed/upsert

### global/interceptor

- `RateLimitInterceptor.java`: 게임 턴 API 속도 제한

### global/utils/validator

- `JapaneseUtils.java`: 문자 정규화
- `WordFinder.java`: 입력 단어 resolve
- `ShiritoriValidator.java`: 끝말 규칙 검증

### domain/game

- `GameController.java`
- `GameService.java`
- `Game.java`, `GameStatus.java`, `JlptLevel.java`
- `GameRepository.java`
- `GameStartRequest.java`, `GameStartResponse.java`

### domain/gameTurn

- `GameTurnService.java`
- `GameTurn.java`
- `GameTurnRepository.java`
- `TurnRequest.java`, `TurnResponse.java`

### domain/profile

- `ProfileController.java`
- `ProfileService.java`
- `Profile.java`
- `ProfileRepository.java`
- `NicknameRequest.java`, `ProfileResponse.java`

### domain/word

- `WordController.java`
- `WordService.java`
- `Word.java`
- `WordRepository.java`
- `WordCsvDto.java`, `WordResponse.java`

### domain/wordBook

- `WordBookController.java`
- `WordBookService.java`
- `WordBook.java`, `QuizType.java`
- `WordBookRepository.java`
- `AddWordRequest.java`, `WordBookResponse.java`, `QuizResponse.java`

### domain/ranking

- `RankingController.java`
- `Ranking.java`
- `RankingRepository.java`

### 테스트

- `src/test/java/hello/shiritori/ShiritoriApplicationTests.java`
- `src/test/java/hello/shiritori/domain/game/entity/GameTest.java`
- `src/test/java/hello/shiritori/domain/game/service/GameServiceTest.java`
- `src/test/java/hello/shiritori/domain/profile/service/ProfileServiceTest.java`
- `src/test/java/hello/shiritori/domain/word/entity/WordTest.java`
- `src/test/java/hello/shiritori/domain/wordBook/service/WordBookServiceTest.java`
- `src/test/resources/application.properties`

### 리소스/정적 자산

- `src/main/resources/data/output.csv`: 대규모 단어 소스
- `src/main/resources/static/しりとり.png`
- `src/main/resources/static/erd.png`

