import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/axios';
import { getApiErrorMessage, getApiErrorStatus } from '../api/error';
import BottomTabBar from '../components/BottomTabBar';
import InlineState from '../components/InlineState';

interface WordBookItem {
  id: number;
  wordId: number;
  word: string;
  reading: string;
  meaning: string;
  level?: string;
  createdAt: string;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

function levelBadgeClass(level?: string): string {
  switch (level) {
    case 'N1':
      return 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-200';
    case 'N2':
    case 'N3':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-200';
    case 'N4':
    case 'N5':
      return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-200';
    default:
      return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-200';
  }
}

export default function WordBookPage() {
  const navigate = useNavigate();
  const [words, setWords] = useState<WordBookItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showReading, setShowReading] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);

  const fetchWords = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.get<ApiResponse<WordBookItem[]>>('/wordBooks');
      if (res.data.code === 200) {
        setWords(res.data.data);
      }
    } catch (error: unknown) {
      if (getApiErrorStatus(error) === 401) {
        setErrorMsg('로그인이 만료되었습니다. 홈에서 다시 로그인해 주세요.');
      } else {
        setErrorMsg(getApiErrorMessage(error, '단어장을 불러오지 못했습니다.'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWords();
  }, [fetchWords]);

  const handleAddWord = async () => {
    if (!inputText.trim()) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await apiClient.post<ApiResponse<WordBookItem>>('/wordBooks', {
        word: inputText.trim(),
      });
      if (response.data.code === 200) {
        setInputText('');
        await fetchWords();
      }
    } catch (error: unknown) {
      setErrorMsg(getApiErrorMessage(error, '단어 추가에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteTargetId === null) return;

    try {
      await apiClient.delete(`/wordBooks/${deleteTargetId}`);
      setWords((prev) => prev.filter((item) => item.id !== deleteTargetId));
      setDeleteTargetId(null);
    } catch (error: unknown) {
      setErrorMsg(getApiErrorMessage(error, '삭제 중 오류가 발생했습니다.'));
      setDeleteTargetId(null);
    }
  };

  const isEmpty = useMemo(() => !loading && words.length === 0, [loading, words.length]);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top_right,_#eef2ff_0%,_#f7f7f9_38%,_#f7f7f9_100%)] dark:bg-[radial-gradient(circle_at_top_right,_#1f2937_0%,_#0f172a_42%,_#020617_100%)]">
      <header className="z-10 flex-none bg-white/95 pt-safe-top shadow-sm backdrop-blur-sm dark:bg-slate-900/95 dark:shadow-black/40">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-black text-indigo-900 dark:text-indigo-100">나만의 단어장</h1>
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
            {words.length}개
          </span>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col overflow-y-auto px-4 pb-4 pt-4">
        <section className="mb-3 rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm dark:border-indigo-800 dark:bg-slate-900">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  void handleAddWord();
                }
              }}
              placeholder="단어를 추가하세요"
              disabled={submitting}
              className="h-11 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              onClick={() => {
                void handleAddWord();
              }}
              disabled={submitting || !inputText.trim()}
              className="h-11 rounded-xl bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              추가
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              data-sfx="off"
              onClick={() => setShowReading((prev) => !prev)}
              className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
                showReading
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200'
                  : 'border-gray-200 bg-gray-100 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              읽기 {showReading ? '표시' : '숨김'}
            </button>
            <button
              data-sfx="off"
              onClick={() => setShowMeaning((prev) => !prev)}
              className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${
                showMeaning
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200'
                  : 'border-gray-200 bg-gray-100 text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              뜻 {showMeaning ? '표시' : '숨김'}
            </button>
          </div>
        </section>

        {errorMsg ? (
          <div className="mb-3">
            <InlineState
              type="error"
              message={errorMsg}
              actionLabel="다시 시도"
              onAction={() => {
                void fetchWords();
              }}
            />
          </div>
        ) : null}

        <section className="flex-1 space-y-2 pb-4">
          {loading ? (
            <InlineState type="loading" message="단어장을 불러오는 중..." />
          ) : isEmpty ? (
            <InlineState type="empty" message="저장된 단어가 없습니다. 첫 단어를 추가해보세요." />
          ) : (
            words.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                {deleteTargetId === item.id ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-red-100 bg-red-50 p-2 dark:border-red-900/70 dark:bg-red-950/50">
                    <p className="text-xs font-bold text-red-600 dark:text-red-200">정말 삭제할까요?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDeleteTargetId(null)}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => {
                          void confirmDelete();
                        }}
                        className="rounded-lg bg-red-500 px-2 py-1 text-xs font-bold text-white"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h2 className="truncate text-base font-black text-gray-900 dark:text-slate-100">{item.word}</h2>
                        {item.level && item.level !== 'null' ? (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${levelBadgeClass(item.level)}`}>
                            {item.level}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                        <span className={showReading ? '' : 'blur-[3px] select-none'}>{item.reading}</span>
                        <span className="mx-2 text-gray-300 dark:text-slate-600">|</span>
                        <span className={showMeaning ? 'text-indigo-600 dark:text-indigo-300' : 'blur-[3px] select-none'}>
                          {item.meaning}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteTargetId(item.id)}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-bold text-gray-400 transition hover:text-red-500 dark:border-slate-700 dark:text-slate-500"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      </main>

      <BottomTabBar
        current="wordbook"
        onHome={() => navigate('/')}
        onWordBook={() => navigate('/wordbook')}
        onQuiz={() => navigate('/', { state: { openModal: 'quiz' } })}
        onRanking={() => navigate('/ranking')}
        onOptions={() => navigate('/', { state: { openModal: 'options' } })}
      />
    </div>
  );
}
