# 🎮 Shiritori

Spring Boot와 React를 활용한 일본어 끝말잇기 게임입니다.

## 📷 Preview

<table width="100%">
  <tr>
    <td align="center" width="50%">
      <video src="https://github.com/user-attachments/assets/af2edf50-b86a-4fd1-9e9b-492466ba823b" controls autoplay loop muted style="width: 100%;"></video>
    </td>
    <td align="center" width="50%">
      <video src="https://github.com/user-attachments/assets/d60b7064-418d-41dd-b73d-02fca64d3762" controls autoplay loop muted style="width: 100%;"></video>
    </td>
  </tr>
</table>

## 🚀 Getting Started

- [게임 하러가기](https://shiritori-game-gold.vercel.app/)

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
    <img src="shiritori-backend/src/main/resources/static/erd.png" width="500">
</div>

## 💣 Troubleshooting

### 1. 무료 클라우드 환경의 연결 불안정 해결

- **문제**: Render(서버)와 Supabase(DB) 간의 물리적 거리 및 Free Tier 절전 모드로 인해 `SocketTimeoutException`이 빈번하게 발생.
- **해결**: `application.properties`에서 HikariCP 설정을 튜닝. `connection-timeout`을 60초로 늘리고, `validation-timeout`을 조정하여 연결 끊김
  현상을 90% 이상 감소시킴.

### 2. 데이터 무결성 보장

- **문제**: 구글 로그인 직후, 백엔드 서버가 프로필을 조회할 때 데이터가 생성되지 않아 500 에러 발생.
- **해결**: 애플리케이션 레벨이 아닌 DB 레벨에서 처리하도록 **PostgreSQL Trigger**를 구현. `auth.users`에 데이터가 들어오는 즉시 `public.profiles`에 복제되도록 하여
  원자성 보장.

