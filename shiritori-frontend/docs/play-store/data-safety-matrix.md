# Data Safety Matrix (Android)

Google Play Console `App content > Data safety` 작성 시 사용하는 내부 기준표입니다.

## 1) 기본 원칙

1. 앱/백엔드/인증 SDK에서 실제 전송되는 데이터만 기준으로 작성합니다.
2. 불명확한 항목은 "수집 안 함"으로 제출하지 말고 코드/로그로 먼저 확인합니다.
3. 정책 제출값은 릴리즈마다 재검토합니다.

## 2) 데이터 항목 매트릭스

| 항목 | 수집 여부 | 목적 | 공유 여부 | 처리 위치 |
|---|---|---|---|---|
| 이메일(구글 로그인) | 수집 | 인증/계정 식별 | Supabase 인증 처리 과정에서 처리 | Supabase Auth |
| 사용자 식별자(auth uid) | 수집 | 계정 연결, 데이터 소유권 매핑 | 내부 처리 | Backend + DB |
| 닉네임 | 수집 | 프로필 표시, 랭킹 노출 | 내부 처리 | Backend + DB |
| 게임 기록(점수/콤보/통계) | 수집 | 게임 기능 제공, 랭킹 계산 | 내부 처리 | Backend + DB |
| 단어장 데이터 | 수집 | 사용자 저장 기능 | 내부 처리 | Backend + DB |
| 기술 로그(오류/요청 메타) | 최소 수집 | 안정성/보안/장애 분석 | 인프라 제공사 로그 경로 포함 가능 | Backend/Hosting |

## 3) Play Console 입력 시 체크

1. `Data collected`: 위 표에서 수집 항목을 모두 반영
2. `Data shared`: 제3자 전송 여부를 SDK/인프라 기준으로 사실대로 표기
3. `Data encrypted in transit`: HTTPS 사용 여부 확인 후 표기
4. `Data deletion`: 앱 내 계정 삭제 및 웹 리소스(URL) 제공 여부 표기

## 4) 제출 전 증빙

1. 로그인 플로우에서 전송되는 필드 확인(네트워크 탭/백엔드 로그)
2. 탈퇴 API(`DELETE /api/profiles/me`) 호출 후 데이터 삭제 확인
3. 정책 URL 접근 확인:
   - `/legal/privacy-ko.html`
   - `/legal/account-deletion-ko.html`

## 5) 업데이트 규칙

아래 중 하나라도 바뀌면 Data safety를 다시 검토합니다.

1. 신규 SDK 도입(광고/분석/푸시 등)
2. 신규 개인정보 필드 추가
3. 데이터 저장소 또는 인증 구조 변경
4. 계정 삭제/보관 정책 변경
