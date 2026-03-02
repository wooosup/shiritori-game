import { useNavigate } from 'react-router-dom';

interface LegalDocumentPageProps {
  title: string;
  type: 'privacy' | 'account-deletion';
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
        <p>[운영자 이메일 입력 필요]</p>
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
        <h2 className="mb-2 text-sm font-black text-gray-900 dark:text-slate-100">문의</h2>
        <p>[운영자 이메일 입력 필요]</p>
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
        {type === 'privacy' ? <PrivacyContent /> : <AccountDeletionContent />}
      </main>
    </div>
  );
}
