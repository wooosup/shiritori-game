# 🎮 Shiritori

Spring Boot와 React를 활용한 일본판 끝말잇기 게임입니다.

## 📷 Preview

<div align="center">
  <video src="https://github.com/user-attachments/assets/af2edf50-b86a-4fd1-9e9b-492466ba823b" width="80%" controls autoplay loop muted></video>
</div>

## 🚀 Getting Started

- [게임 하러가기](https://shiritori-game-gold.vercel.app/)

## 🔥 Key Features

- **끝말잇기 로직**
    - 히라가나/가타카나 변환 및 장음 처리
    - `ん`으로 끝나는 단어 패배 처리
- **보안**
    - **Spring Security + JWT + OAuth2**를 활용한 무상태(Stateless) 인증
    - **Rate Limiting**: 비정상적인 광클 및 매크로 공격 차단
- **데이터 동기화 자동화**
    - PostgreSQL **Trigger & Function**을 활용한 Auth 유저와 게임 프로필 간 실시간 동기화

## 🛠 Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Spring Boot, JPA, PostgreSQL (Supabase)
- **Infra**: Docker, Render, Vercel

## 🏗 Architecture
<div align="center">
    <img src="shiritori-backend/src/main/resources/static/しりとり.png" width="600">
</div>

## 🗄️ ERD

<div align="center">
    <img src="shiritori-backend/src/main/resources/static/db_erd.png" width="400">
</div>

## 💣 Technical Challenges & Solutions

### 1. 무료 클라우드 환경의 연결 불안정 해결

- **문제**: Render(서버)와 Supabase(DB) 간의 물리적 거리 및 Free Tier 절전 모드로 인해 `SocketTimeoutException`이 빈번하게 발생.
- **해결**: `application.properties`에서 HikariCP 설정을 튜닝. `connection-timeout`을 60초로 늘리고, `validation-timeout`을 조정하여 연결 끊김
  현상을 90% 이상 감소시킴.

### 2. 데이터 무결성 보장

- **문제**: 구글 로그인 직후, 백엔드 서버가 프로필을 조회할 때 데이터가 생성되지 않아 500 에러 발생.
- **해결**: 애플리케이션 레벨이 아닌 DB 레벨에서 처리하도록 **PostgreSQL Trigger**를 구현. `auth.users`에 데이터가 들어오는 즉시 `public.profiles`에 복제되도록 하여
  원자성 보장.

