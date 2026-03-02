# Google Play Upload Checklist (Android)

이 문서는 `com.shiritori.game` 앱을 Google Play에 업로드할 때 사용하는 실행 체크리스트입니다.

## 1) 빌드 산출물 확인

1. AAB 파일:
   - `android/app/build/outputs/bundle/release/app-release.aab`
2. 패키지/버전 확인:
   - `applicationId`: `com.shiritori.game`
   - `versionCode`: `android/app/build.gradle` 값 사용 (release 전에 자동 증가)
   - `versionName`: `android/app/build.gradle` 값 사용
3. 권장 검증:
   - `shasum -a 256 android/app/build/outputs/bundle/release/app-release.aab`

## 2) 릴리즈 빌드 명령

`shiritori-frontend` 폴더에서 실행:

```bash
npm run android:release
```

이 명령은 아래를 순서대로 수행합니다.
1. 모바일 env 검증
2. `versionCode` 자동 증가
3. 웹 빌드
4. Capacitor Android sync
5. `bundleRelease` 실행

## 3) Play Console 내부 테스트 업로드

1. Play Console > 앱 선택(또는 새 앱 생성)
2. `Testing > Internal testing > Create new release`
3. `app-release.aab` 업로드
4. 릴리즈 노트 입력
5. `Review release` > `Start rollout to Internal testing`
6. `Testers` 탭에서 테스터 이메일 추가 후 opt-in 링크 공유

## 4) 프로덕션 전에 막히기 쉬운 필수 항목

Play Console `Policy and programs > App content`에서 최소 아래 항목 완료:
1. Privacy Policy URL
2. Data safety
3. Target audience and content
4. Content rating questionnaire
5. (해당 시) Ads declaration
6. (해당 시) Sensitive permissions declarations

참고: 첫 배포 전에는 Dashboard/Publishing overview에 미완료 항목이 있으면 `Create new release`가 비활성화될 수 있음.

## 5) 개인 개발자 계정(신규) 주의사항

개인 계정이 2023-11-13 이후 생성된 경우, 프로덕션 공개 전 테스트 요건이 적용될 수 있습니다.
1. Closed test를 먼저 운영
2. 최소 12명 tester가 14일 연속 opt-in 상태 유지
3. 이후 production access 신청

실제 적용 여부는 Play Console 계정 상태/배너 안내를 우선 확인하세요.

## 6) Data safety 작성 시 실무 체크

이 앱은 Google 로그인(Supabase/Google OAuth), 프로필(닉네임), 게임 기록/단어장 저장을 사용하므로
데이터 항목을 "수집 없음"으로 제출하면 리젝 가능성이 큽니다.

제출 전에 반드시 확인:
1. 앱/백엔드/SDK에서 실제로 서버로 전송되는 데이터 유형
2. 제3자 SDK 전송 여부(예: 인증 SDK)
3. 전송 암호화(HTTPS) 여부
4. 사용자 삭제 요청 처리(앱 내 탈퇴 기능 제공 여부)

상세 작성 기준은 `docs/play-store/data-safety-matrix.md`를 기준으로 작성합니다.

## 6-1) Privacy/Deletion URL 준비

Play Console 제출 전 아래 정적 페이지를 호스팅 가능한 URL로 노출해야 합니다.

1. `public/legal/privacy-ko.html`
2. `public/legal/account-deletion-ko.html`

검증 체크리스트:
1. `docs/play-store/privacy-policy-checklist.md`
2. `docs/play-store/app-access-for-review.md`

## 7) 트러블슈팅

1. `You cannot create a new release when you have outstanding releases`
   - Publishing overview에서 미완료/미제출 변경 정리 후 재시도
2. `Create new release` 버튼 비활성화
   - Dashboard의 setup tasks 완료 필요
3. 업로드 실패(버전코드 중복)
   - 새 AAB 재빌드 (`android:release`는 자동 bump)

## 8) 최종 배포 권장 순서

1. Internal testing 안정화
2. Closed testing 소수 사용자 검증
3. Production staged rollout (예: 5% -> 20% -> 100%)
