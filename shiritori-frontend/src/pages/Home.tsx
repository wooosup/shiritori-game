import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, apiClient } from '../api/axios';
import NicknameModal from '../components/NicknameModal';
import RuleModal from '../components/RuleModal';
import SearchModal from '../components/SearchModal';
import WordBookModal from '../components/WordBookModal';
import QuizModal from '../components/QuizModal';
import RankingModal from '../components/RankingModal';
import { signInWithGoogle, signOutNativeGoogle } from '../platform/auth';
import { type ThemePreference, useSettingsStore } from '../stores/settingsStore';
import StartPage from './StartPage';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface Ranking {
  nickname: string;
  maxCombo: number;
  score: number;
  level: string;
  endedAt: string;
}

const LEVEL_OPTIONS = [
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
  { value: 'ALL', label: 'ALL' },
] as const;

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

function toRanking(value: unknown): Ranking | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as Record<string, unknown>;
  const score = Number(row.score);
  const maxCombo = Number(row.maxCombo);

  if (!Number.isFinite(score)) {
    return null;
  }

  return {
    nickname: typeof row.nickname === 'string' ? row.nickname : '',
    maxCombo: Number.isFinite(maxCombo) ? maxCombo : 0,
    score,
    level: typeof row.level === 'string' ? row.level : String(row.level ?? 'ALL'),
    endedAt: typeof row.endedAt === 'string' ? row.endedAt : '',
  };
}

function toRankingList(value: unknown): Ranking[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((row) => toRanking(row)).filter((row): row is Ranking => row !== null);
}

function findMyBestFromList(rankings: Ranking[], nickname: string | null): Ranking | null {
  const key = nickname?.trim().toLowerCase();
  if (!key) {
    return null;
  }

  const mine = rankings.filter((row) => row.nickname.trim().toLowerCase() === key);
  if (mine.length === 0) {
    return null;
  }

  return [...mine].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.maxCombo - a.maxCombo;
  })[0];
}

export default function Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [level, setLevel] = useState('N5');
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [myRank, setMyRank] = useState<Ranking | null>(null);

  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showWordBook, setShowWordBook] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const [totalWords, setTotalWords] = useState<number>(0);
  const [bannerWords, setBannerWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMyRank, setIsLoadingMyRank] = useState(false);
  const [totalWordsError, setTotalWordsError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [rankingsError, setRankingsError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const { sfxEnabled, toggleSfx, themePreference, resolvedTheme, setThemePreference } = useSettingsStore();

  const isMounted = useRef(true);

  const displayMyRank = useMemo(() => {
    return myRank ?? findMyBestFromList(rankings, nickname);
  }, [myRank, rankings, nickname]);

  const displayNickname = useMemo(() => nickname?.trim() || '플레이어', [nickname]);
  const featuredWord = useMemo(() => bannerWords[0], [bannerWords]);
  const displayMyRankTimestamp = useMemo(() => {
    if (!displayMyRank?.endedAt) {
      return null;
    }
    const parsed = new Date(displayMyRank.endedAt);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return `${parsed.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} ${parsed.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
  }, [displayMyRank]);
  const themeStatusLabel = useMemo(() => {
    if (themePreference === 'system') {
      return resolvedTheme === 'dark' ? '현재 적용: 시스템(다크)' : '현재 적용: 시스템(라이트)';
    }
    return themePreference === 'dark' ? '현재 적용: 다크' : '현재 적용: 라이트';
  }, [themePreference, resolvedTheme]);

  const fetchRankings = useCallback(async () => {
    setRankingsError(null);
    try {
      const rankRes = await apiClient.get<ApiResponse<unknown>>('/ranks');
      if (rankRes.data.code === 200) {
        if (isMounted.current) {
          setRankings(toRankingList(rankRes.data.data));
        }
        return;
      }
    } catch {
      // ignore and show fallback message below
    }
    if (isMounted.current) {
      setRankingsError('랭킹을 불러오지 못했어요.');
    }
  }, []);

  const fetchWordCount = useCallback(async () => {
    setTotalWordsError(null);
    try {
      const countRes = await apiClient.get<ApiResponse<number>>('/words/count');
      if (countRes.data.code === 200 && isMounted.current) {
        setTotalWords(countRes.data.data);
        return;
      }
    } catch {
      // no-op: fallback below
    }
    if (isMounted.current) {
      setTotalWordsError('단어 수를 불러오지 못했어요.');
    }
  }, []);

  const fetchBannerWords = useCallback(async () => {
    setBannerError(null);
    try {
      const randomRes = await apiClient.get<ApiResponse<any[]>>('/words/random');
      if (randomRes.data.code === 200 && isMounted.current) {
        setBannerWords(randomRes.data.data);
        return;
      }
    } catch {
      // no-op: fallback below
    }
    if (isMounted.current) {
      setBannerWords([]);
      setBannerError('배너 단어를 불러오지 못했어요.');
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    const refreshMyRank = async () => {
      setIsLoadingMyRank(true);
      try {
        const response = await apiClient.get<ApiResponse<unknown>>('/ranks/me');
        if (isMounted.current && response.data.code === 200) {
          setMyRank(toRanking(response.data.data));
        }
      } catch {
        if (isMounted.current) {
          setMyRank(null);
        }
      } finally {
        if (isMounted.current) {
          setIsLoadingMyRank(false);
        }
      }
    };

    const init = async () => {
      const timer = setTimeout(() => {
        if (isMounted.current) setLoading(false);
      }, 1000);

      try {
        const sessionPromise = supabase.auth.getSession();
        await Promise.all([fetchWordCount(), fetchBannerWords(), fetchRankings()]);
        const [sessionRes] = await Promise.allSettled([sessionPromise]);

        if (sessionRes.status === 'fulfilled' && sessionRes.value.data.session) {
          const session = sessionRes.value.data.session;
          if (isMounted.current) setUser(session.user);

          try {
            const profileRes = await apiClient.get<ApiResponse<{ nickname: string | null }>>('/profiles/me');
            if (isMounted.current && profileRes.data.code === 200) {
              setNickname(profileRes.data.data.nickname);
            }
          } catch (err: any) {
            if (err.response?.status === 401) {
              handleLogout();
              return;
            }
          }

          await refreshMyRank();
        }
      } catch (error) {
        console.error('초기화 에러:', error);
      } finally {
        clearTimeout(timer);
        if (isMounted.current) setLoading(false);
      }
    };

    void init();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted.current) return;

      if (event === 'SIGNED_IN' && session) {
        setIsLoggingIn(false);
        setLoginError(null);
        setUser(session.user);
        apiClient
          .get<ApiResponse<{ nickname: string | null }>>('/profiles/me')
          .then(async (res) => {
            if (isMounted.current && res.data.code === 200) {
              const myNick = res.data.data.nickname;
              setNickname(myNick);
              if (!myNick) setShowNicknameModal(true);
            }
            await refreshMyRank();
          })
          .catch(() => {});
      }

      if (event === 'SIGNED_OUT') {
        setIsLoggingIn(false);
        setUser(null);
        setNickname(null);
        setMyRank(null);
      }
    });

    return () => {
      isMounted.current = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchBannerWords, fetchRankings, fetchWordCount]);

  const handleLogin = async () => {
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('로그인 시작 실패:', error);
      setLoginError(error?.message || '로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    signOutNativeGoogle().catch(() => {});
    supabase.auth.signOut().catch(() => {});
    localStorage.clear();
    window.location.replace(`${window.location.origin}/#/`);
  };

  const handleDeleteAccount = async () => {
    setOptionsError(null);
    setIsDeletingAccount(true);
    try {
      await apiClient.delete('/profiles/me');
      handleLogout();
    } catch {
      setOptionsError('계정 탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirmModal(false);
    }
  };

  const openLegalPage = useCallback(
    (path: 'privacy' | 'account-deletion') => {
      setOptionsError(null);
      setShowOptionsModal(false);
      navigate(path === 'privacy' ? '/legal/privacy' : '/legal/account-deletion');
    },
    [navigate],
  );

  const handleStart = () => {
    if (!user) {
      handleLogin();
      return;
    }

    if (!nickname) {
      setShowNicknameModal(true);
      return;
    }

    navigate('/game', { state: { level } });
  };

  if (loading) {
    return <div className="flex h-[100dvh] items-center justify-center bg-[#F7F7F9] text-gray-700 dark:bg-slate-950 dark:text-slate-100">로딩 중...</div>;
  }

  if (!user) {
    return <StartPage onGoogleLogin={handleLogin} loading={isLoggingIn} errorMessage={loginError} />;
  }

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top_right,_#eef2ff_0%,_#f7f7f9_38%,_#f7f7f9_100%)] dark:bg-[radial-gradient(circle_at_top_right,_#1f2937_0%,_#0f172a_42%,_#020617_100%)]">
      <WordBookModal isOpen={showWordBook} onClose={() => setShowWordBook(false)} />
      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
      <QuizModal isOpen={showQuizModal} onClose={() => setShowQuizModal(false)} />
      <RankingModal
        isOpen={showRankingModal}
        onClose={() => setShowRankingModal(false)}
        rankings={rankings}
        loading={loading}
      />

      {user && (
        <NicknameModal
          isOpen={showNicknameModal}
          canClose={!!nickname}
          onClose={() => {
            if (nickname) setShowNicknameModal(false);
          }}
          onSuccess={(newNick) => {
            setNickname(newNick);
            setShowNicknameModal(false);
            fetchRankings().catch(() => {});
            apiClient
              .get<ApiResponse<unknown>>('/ranks/me')
              .then((res) => setMyRank(toRanking(res.data.data)))
              .catch(() => {});
          }}
        />
      )}

      {showOptionsModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl animate-slideInUp">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200" />

            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">옵션</p>
              <p className="text-base font-bold text-gray-800">{nickname || '닉네임 미설정'}</p>
            </div>

            {optionsError ? (
              <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                {optionsError}
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="mb-2 text-sm font-bold text-gray-700">테마</p>
                <div className="grid grid-cols-3 gap-2">
                  {THEME_OPTIONS.map((option) => {
                    const active = themePreference === option.value;
                    return (
                      <button
                        key={option.value}
                        data-sfx="off"
                        onClick={() => setThemePreference(option.value)}
                        className={`rounded-xl border px-2 py-2 text-xs font-bold transition active:scale-[0.99] ${
                          active
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] font-semibold text-indigo-600">{themeStatusLabel}</p>
              </div>

              <button
                onClick={() => {
                  setShowOptionsModal(false);
                  setShowNicknameModal(true);
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 active:scale-[0.99]"
              >
                <span>닉네임 변경</span>
                <span className="text-gray-400">›</span>
              </button>

              <button
                data-sfx="off"
                onClick={toggleSfx}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 active:scale-[0.99]"
              >
                <span>효과음</span>
                <span className={sfxEnabled ? 'text-indigo-600' : 'text-red-500'}>{sfxEnabled ? '켜짐' : '꺼짐'}</span>
              </button>

              <button
                onClick={() => {
                  setShowOptionsModal(false);
                  setShowRuleModal(true);
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700 active:scale-[0.99]"
              >
                <span>게임 규칙</span>
                <span className="text-gray-400">›</span>
              </button>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-gray-500">약관 및 정책</p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      openLegalPage('privacy');
                    }}
                    className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left text-sm font-bold text-gray-700 active:scale-[0.99]"
                  >
                    <span>개인정보처리방침</span>
                    <span className="text-xs font-semibold text-indigo-500">열기</span>
                  </button>

                  <button
                    onClick={() => {
                      openLegalPage('account-deletion');
                    }}
                    className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left text-sm font-bold text-gray-700 active:scale-[0.99]"
                  >
                    <span>계정 삭제 안내</span>
                    <span className="text-xs font-semibold text-indigo-500">열기</span>
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowOptionsModal(false);
                  handleLogout();
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 active:scale-[0.99]"
              >
                <span>로그아웃</span>
                <span className="text-red-300">›</span>
              </button>

              <button
                data-sfx="off"
                onClick={() => {
                  setShowDeleteConfirmModal(true);
                }}
                disabled={isDeletingAccount}
                className="flex w-full items-center justify-between rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 disabled:cursor-wait disabled:opacity-70 active:scale-[0.99]"
              >
                <span>{isDeletingAccount ? '탈퇴 처리 중...' : '계정 탈퇴'}</span>
                <span className="text-red-300">›</span>
              </button>
            </div>

            <button
              onClick={() => {
                setShowOptionsModal(false);
                setShowDeleteConfirmModal(false);
                setOptionsError(null);
              }}
              className="mt-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-500 active:scale-[0.99]"
            >
              닫기
            </button>
          </div>
        </div>
      ) : null}

      {showDeleteConfirmModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <p className="text-sm font-bold text-gray-900">계정을 탈퇴할까요?</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              닉네임, 게임 기록, 단어장 데이터가 삭제되며 복구할 수 없습니다.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                data-sfx="off"
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={isDeletingAccount}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-500 disabled:opacity-60"
              >
                취소
              </button>
              <button
                data-sfx="off"
                type="button"
                onClick={() => {
                  handleDeleteAccount().catch(() => {});
                }}
                disabled={isDeletingAccount}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-60"
              >
                {isDeletingAccount ? '처리 중...' : '탈퇴 진행'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <RuleModal isOpen={showRuleModal} onClose={() => setShowRuleModal(false)} />

      <header className="z-10 flex-none bg-white/95 pt-safe-top shadow-sm backdrop-blur-sm dark:bg-slate-900/95 dark:shadow-black/40">
        <div className="flex h-14 items-center justify-between px-4">
          <img src="/logo.png" alt="しりとり" className="h-8 w-auto object-contain" />

          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white px-3 py-2 text-left shadow-[0_4px_16px_-10px_rgba(79,70,229,0.45)] dark:border-indigo-800 dark:from-indigo-900 dark:to-slate-900">
            <p className="max-w-[96px] truncate text-sm font-black text-indigo-900 dark:text-indigo-100">{displayNickname}</p>
          </div>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col items-center overflow-y-auto px-4 pb-8 pt-5">
        <div className="flex items-center justify-between w-full max-w-md mb-5">
          <div className="text-sm font-bold text-gray-500 flex items-center gap-2 bg-white px-3 py-2 rounded-2xl shadow-sm">
            📚 단어 <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{totalWords.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setShowSearchModal(true)}
            className="bg-white px-4 py-2 rounded-2xl text-gray-500 hover:text-indigo-600 shadow-sm transition active:scale-95 text-sm font-bold flex items-center gap-1"
          >
            🔍 검색
          </button>
        </div>

        <section className="mb-5 w-full max-w-md rounded-3xl border border-indigo-100 bg-white/95 p-4 shadow-[0_8px_30px_-20px_rgba(79,70,229,0.45)] dark:border-indigo-800 dark:bg-slate-900">
          <p className="text-[11px] font-black tracking-[0.04em] text-indigo-500 dark:text-indigo-300">오늘의 단어</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-indigo-900 dark:text-indigo-100">
            {featuredWord?.word || 'しりとり'}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-500">
            {featuredWord
              ? `${featuredWord.reading} · ${featuredWord.meaning}`
              : '게임을 시작해서 오늘의 단어 감각을 깨워보세요.'}
          </p>
        </section>

        {(totalWordsError || bannerError) ? (
          <div className="w-full max-w-md mb-4 space-y-2">
            {totalWordsError ? (
              <div className="flex items-center justify-between rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                <p className="text-xs font-medium text-red-600">{totalWordsError}</p>
                <button
                  data-sfx="off"
                  onClick={() => fetchWordCount()}
                  className="text-xs font-bold text-red-600 underline underline-offset-2"
                >
                  다시 시도
                </button>
              </div>
            ) : null}
            {bannerError ? (
              <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                <p className="text-xs font-medium text-amber-700">{bannerError}</p>
                <button
                  data-sfx="off"
                  onClick={() => fetchBannerWords()}
                  className="text-xs font-bold text-amber-700 underline underline-offset-2"
                >
                  다시 시도
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="relative mb-6 w-full max-w-md rounded-3xl bg-white p-5 shadow-[0_8px_28px_-16px_rgba(15,23,42,0.24)] dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 dark:border-indigo-800 dark:bg-indigo-950/40">
            <div>
              <p className="text-[10px] font-black tracking-[0.08em] text-indigo-500 dark:text-indigo-300">게임 안내</p>
              <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">제한 시간 20초 · PASS 3회</p>
            </div>
            <button
              onClick={() => setShowRuleModal(true)}
              className="text-[11px] font-bold text-indigo-500 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-900/60 px-2.5 py-1.5 rounded-xl flex items-center gap-1 active:scale-95 transition"
            >
              규칙 보기
            </button>
          </div>

          <div className="mb-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-3 dark:border-indigo-800 dark:from-indigo-950/50 dark:to-slate-900">
            <p className="px-1 pb-2 text-[11px] font-black tracking-[0.08em] text-indigo-500 dark:text-indigo-300">난이도</p>
            <div className="grid grid-cols-3 gap-2">
              {LEVEL_OPTIONS.map((option) => {
                const active = level === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLevel(option.value)}
                    className={`rounded-xl border px-3 py-2 text-sm font-black tracking-wide transition ${
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-[0_8px_18px_-12px_rgba(79,70,229,0.9)]'
                        : 'border-indigo-100 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-200 active:scale-95'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleStart}
            className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-indigo-600 text-lg font-black leading-none text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)] transition-transform active:scale-95"
          >
            START
          </button>
        </div>

        <div className="mb-6 w-full max-w-md rounded-3xl border border-indigo-100 bg-white p-4 shadow-[0_10px_28px_-18px_rgba(79,70,229,0.45)] dark:border-indigo-800 dark:bg-slate-900">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-100">나의 최고 기록</h3>
              <p className="mt-0.5 text-[11px] font-semibold text-indigo-500 dark:text-indigo-300">한 판 더 해서 기록 갱신에 도전해보세요.</p>
            </div>
            {displayMyRankTimestamp ? (
              <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/60 px-2 py-1 text-[10px] font-bold text-indigo-500 dark:text-indigo-200">
                {displayMyRankTimestamp}
              </span>
            ) : null}
          </div>

          <div className="mt-3">
            {!user ? (
              <p className="text-sm text-gray-500">로그인하고 내 기록을 저장해보세요.</p>
            ) : isLoadingMyRank ? (
              <p className="text-sm text-gray-500">기록을 불러오는 중...</p>
            ) : displayMyRank ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-indigo-100 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/50 px-3 py-3">
                  <p className="text-[11px] font-bold tracking-[0.06em] text-indigo-500 dark:text-indigo-300">점수</p>
                  <p className="mt-1 text-2xl font-black text-indigo-900 dark:text-indigo-100">{displayMyRank.score.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 px-3 py-3">
                  <p className="text-[11px] font-bold tracking-[0.06em] text-gray-500">최대 콤보</p>
                  <p className="mt-1 text-2xl font-black text-gray-900">{displayMyRank.maxCombo}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">아직 플레이 기록이 없습니다.</p>
            )}
          </div>

          {rankingsError ? (
            <div className="mx-4 mb-4 mt-1 flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-3 py-2">
              <p className="text-xs font-medium text-red-600">{rankingsError}</p>
              <button
                data-sfx="off"
                onClick={() => fetchRankings()}
                className="text-xs font-bold text-red-600 underline underline-offset-2"
              >
                다시 시도
              </button>
            </div>
          ) : null}
        </div>

        <div className="h-4 w-full max-w-md" />
      </main>

      <nav className="flex-none w-full bg-white border-t border-gray-100 flex justify-around items-center pb-safe-bottom z-20 shadow-[0_-8px_20px_-1px_rgba(0,0,0,0.03)] pt-2 pb-2 dark:bg-slate-900 dark:border-slate-700 dark:shadow-black/40">
        <button
          onClick={() => window.scrollTo(0, 0)}
          className="flex flex-col items-center justify-center w-1/5 h-12 text-indigo-600 active:scale-95 transition-all"
        >
          <span className="text-xl mb-1">🏠</span>
          <span className="text-[10px] font-bold">홈</span>
        </button>

        <button
          onClick={() => setShowWordBook(true)}
          className="flex flex-col items-center justify-center w-1/5 h-12 text-gray-500 hover:text-indigo-500 active:scale-95 transition-all"
        >
          <span className="text-xl mb-1">📒</span>
          <span className="text-[10px] font-bold">단어장</span>
        </button>

        <button
          onClick={() => setShowQuizModal(true)}
          className="flex flex-col items-center justify-center w-1/5 h-12 text-gray-500 hover:text-indigo-500 active:scale-95 transition-all"
        >
          <span className="text-xl mb-1">📝</span>
          <span className="text-[10px] font-bold">퀴즈</span>
        </button>

        <button
          onClick={() => setShowRankingModal(true)}
          className="flex flex-col items-center justify-center w-1/5 h-12 text-gray-500 hover:text-indigo-500 active:scale-95 transition-all"
        >
          <span className="text-xl mb-1">👑</span>
          <span className="text-[10px] font-bold">랭킹</span>
        </button>

        <button
          onClick={() => setShowOptionsModal(true)}
          className="flex flex-col items-center justify-center w-1/5 h-12 text-gray-500 hover:text-indigo-500 active:scale-95 transition-all"
        >
          <span className="text-xl mb-1">⚙️</span>
          <span className="text-[10px] font-bold">옵션</span>
        </button>
      </nav>
    </div>
  );
}
