import { useNavigate } from 'react-router-dom';

interface LegalDocumentPageProps {
  title: string;
  type: 'privacy' | 'account-deletion' | 'terms';
}

function PrivacyContent() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-700 dark:text-slate-200">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">수집하는 정보</h2>
        <p>Google 로그인 식별 정보, 닉네임, 게임 기록(점수/콤보), 단어장 데이터를 수집합니다.</p>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">이용 목적</h2>
        <p>인증 처리, 게임 기능 제공, 랭킹 계산, 서비스 안정화 및 오류 대응에 사용됩니다.</p>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">보관 및 삭제</h2>
        <p>계정 탈퇴 시 관련 데이터는 법령상 보관 항목을 제외하고 삭제됩니다.</p>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">문의</h2>
        <p>useop0821@gmail.com</p>
      </section>
    </div>
  );
}

function AccountDeletionContent() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-700 dark:text-slate-200">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">앱에서 탈퇴하는 방법</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>홈 화면 우상단 `옵션` 진입</li>
          <li>`계정 탈퇴` 선택</li>
          <li>확인 후 탈퇴 진행</li>
        </ol>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">삭제되는 항목</h2>
        <p>인증 계정, 프로필, 게임 기록, 단어장, 세션 정보가 삭제됩니다.</p>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">앱을 사용할 수 없을 때</h2>
        <p>
          앱 실행이 어렵다면 <span className="font-bold text-gray-900 dark:text-slate-100">useop0821@gmail.com</span>으로
          삭제 요청을 보낼 수 있습니다.
        </p>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          로그인에 사용한 Google 계정 이메일과 함께 `계정 삭제 요청`이라고 적어 보내주세요.
        </p>
      </section>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-700 dark:text-slate-200">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">서비스 안내</h2>
        <p>
          Shiritori는 일본어 끝말잇기 게임과 단어장, 복습 퀴즈를 제공하는 학습형 게임 서비스입니다.
        </p>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">이용 조건</h2>
        <p>Google 로그인 후 서비스를 이용할 수 있으며, 닉네임과 플레이 기록은 서비스 운영에 사용됩니다.</p>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">금지되는 이용</h2>
        <p>비정상 요청, 자동화 남용, 타인 계정 도용, 서비스 운영을 방해하는 행위는 제한될 수 있습니다.</p>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">서비스 변경 및 종료</h2>
        <p>서비스 내용은 개선을 위해 바뀔 수 있으며, 중요한 변경은 앱 또는 운영 채널을 통해 안내합니다.</p>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">문의</h2>
        <p>useop0821@gmail.com</p>
      </section>
    </div>
  );
}

export default function LegalDocumentPage({ title, type }: Readonly<LegalDocumentPageProps>) {
  const navigate = useNavigate();

  return (
    <div className="flex h-[100dvh] flex-col bg-gray-50 dark:bg-slate-950">
      <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-3 pt-safe-top dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={() => {
            navigate(-1);
          }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          뒤로
        </button>
        <h1 className="text-sm font-black text-gray-900 dark:text-slate-100">{title}</h1>
        <div className="w-[52px]" />
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {type === 'privacy' ? <PrivacyContent /> : null}
        {type === 'account-deletion' ? <AccountDeletionContent /> : null}
        {type === 'terms' ? <TermsContent /> : null}
      </main>
    </div>
  );
}
