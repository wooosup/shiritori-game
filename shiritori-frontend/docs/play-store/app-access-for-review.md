# App Access For Review (Android)

Google Play 심사 단계에서 로그인 필요 앱의 `App access` 제출에 사용하는 템플릿입니다.

## 1) 심사 제출용 설명 템플릿

아래 내용을 Play Console에 그대로 복사해 사용하고, 계정/비밀번호 항목만 실제 값으로 교체하세요.

```text
This app requires login to access gameplay.

How to access:
1) Launch app
2) Tap "Google로 시작하기"
3) Sign in with the test Google account provided below

Test account:
- Email: <review-test-email>
- Password: <review-test-password>

If Google sign-in is temporarily unavailable, contact:
<support-email>
```

## 2) 운영 규칙

1. 심사 기간 동안 테스트 계정 삭제/비활성화 금지
2. 2FA가 걸린 계정은 심사용으로 사용하지 않음
3. 국가 제한/기기 제한이 있다면 별도 설명 기재

## 3) 사전 점검

1. 신규 설치 상태에서 로그인부터 게임 시작까지 1분 내 가능
2. 로그인 실패 시 사용자에게 재시도 안내 문구 노출
3. 백엔드 장애 시 빈 화면이 아닌 오류 메시지 노출
4. 테스트 계정으로 실제 게임 플레이 가능(시작/입력/PASS/종료)

## 4) 관련 제출 항목 링크

1. Privacy policy URL: `/legal/privacy-ko.html`
2. Account deletion URL: `/legal/account-deletion-ko.html`
3. Data safety 기준표: `docs/play-store/data-safety-matrix.md`
