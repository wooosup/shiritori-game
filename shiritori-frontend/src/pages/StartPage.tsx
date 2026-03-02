import './StartPage.css';

interface StartPageProps {
  onGoogleLogin: () => void;
  loading?: boolean;
  errorMessage?: string | null;
}

export default function StartPage({ onGoogleLogin, loading = false, errorMessage = null }: Readonly<StartPageProps>) {
  return (
    <div className="start-shell">
      <div className="start-aurora" />
      <div className="start-grid" />

      <main className="start-card" role="main" aria-label="시작 화면">
        <div className="start-logo-wrap">
          <img src="/logo.png" alt="しりとり" className="start-logo" />
        </div>

        <p className="start-kicker">Japanese Word Relay</p>
        <p className="start-subtitle">끝말잇기로 일본어 감각을 올려보세요.</p>

        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={loading}
          className="start-google-btn"
        >
          <img
            src="/google-g-logo.svg"
            alt=""
            aria-hidden="true"
            className="start-google-icon"
          />
          <span>{loading ? '연결 중...' : 'Google로 시작하기'}</span>
        </button>

        {errorMessage ? <p className="start-error">{errorMessage}</p> : null}
      </main>
    </div>
  );
}
