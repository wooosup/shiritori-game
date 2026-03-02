import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/axios';
import InlineState from '../components/InlineState';
import BottomTabBar from '../components/BottomTabBar';
import type { Ranking } from './Home';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

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

export default function RankingPage() {
  const navigate = useNavigate();
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [myRank, setMyRank] = useState<Ranking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [allResponse, myResponse] = await Promise.allSettled([
        apiClient.get<ApiResponse<unknown>>('/ranks'),
        apiClient.get<ApiResponse<unknown>>('/ranks/me'),
      ]);

      if (allResponse.status === 'fulfilled' && allResponse.value.data.code === 200) {
        setRankings(toRankingList(allResponse.value.data.data));
      } else {
        setRankings([]);
      }

      if (myResponse.status === 'fulfilled' && myResponse.value.data.code === 200) {
        setMyRank(toRanking(myResponse.value.data.data));
      } else {
        setMyRank(null);
      }

      if (allResponse.status !== 'fulfilled') {
        setError('랭킹을 불러오지 못했어요.');
      }
    } catch {
      setError('랭킹을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const topThree = useMemo(() => rankings.slice(0, 3), [rankings]);
  const rest = useMemo(() => rankings.slice(3), [rankings]);

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top_right,_#eef2ff_0%,_#f7f7f9_38%,_#f7f7f9_100%)] dark:bg-[radial-gradient(circle_at_top_right,_#1f2937_0%,_#0f172a_42%,_#020617_100%)]">
      <header className="z-10 flex-none bg-white/95 pt-safe-top shadow-sm backdrop-blur-sm dark:bg-slate-900/95 dark:shadow-black/40">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-black text-indigo-900 dark:text-indigo-100">랭킹</h1>
          <button
            data-sfx="off"
            onClick={() => {
              void fetchAll();
            }}
            className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
          >
            새로고침
          </button>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col overflow-y-auto px-4 pb-4 pt-4">
        {error ? (
          <div className="mb-3">
            <InlineState
              type="error"
              message={error}
              actionLabel="다시 시도"
              onAction={() => {
                void fetchAll();
              }}
            />
          </div>
        ) : null}

        <section className="mb-3 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm dark:border-indigo-800 dark:bg-slate-900">
          <h2 className="text-xs font-black tracking-[0.08em] text-indigo-500 dark:text-indigo-300">내 최고 기록</h2>
          {myRank ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 dark:border-indigo-700 dark:bg-indigo-900/50">
                <p className="text-[11px] font-bold text-indigo-500 dark:text-indigo-300">점수</p>
                <p className="mt-1 text-2xl font-black text-indigo-900 dark:text-indigo-100">{myRank.score.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400">최대 콤보</p>
                <p className="mt-1 text-2xl font-black text-gray-900 dark:text-slate-100">{myRank.maxCombo}</p>
              </div>
            </div>
          ) : loading ? (
            <InlineState type="loading" message="내 기록을 불러오는 중..." />
          ) : (
            <InlineState type="empty" message="아직 내 기록이 없습니다." />
          )}
        </section>

        <section className="mb-3 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm dark:border-indigo-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-black text-indigo-900 dark:text-indigo-100">TOP 3</h2>
          {loading ? (
            <InlineState type="loading" message="랭킹을 불러오는 중..." />
          ) : topThree.length === 0 ? (
            <InlineState type="empty" message="아직 랭킹 데이터가 없습니다." />
          ) : (
            <div className="space-y-2">
              {topThree.map((rank, index) => (
                <div
                  key={`${rank.nickname}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2 dark:border-amber-800/60 dark:bg-amber-900/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-amber-600 dark:text-amber-300">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-sm font-black text-gray-900 dark:text-slate-100">{rank.nickname}</span>
                  </div>
                  <span className="text-sm font-black text-indigo-700 dark:text-indigo-200">{rank.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-black text-gray-800 dark:text-slate-100">전체 순위</h2>
          {loading ? (
            <InlineState type="loading" message="순위를 정리하는 중..." />
          ) : rankings.length === 0 ? (
            <InlineState type="empty" message="순위 데이터가 아직 없습니다." />
          ) : (
            <ul className="space-y-2">
              {(rest.length > 0 ? rest : rankings).map((rank, index) => {
                const number = rest.length > 0 ? index + 4 : index + 1;
                return (
                  <li
                    key={`${rank.nickname}-${number}`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center text-xs font-black text-gray-400 dark:text-slate-500">{number}</span>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{rank.nickname}</p>
                        <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">{rank.maxCombo}콤보</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-200">{rank.score.toLocaleString()}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <BottomTabBar
        current="ranking"
        onHome={() => navigate('/')}
        onWordBook={() => navigate('/wordbook')}
        onQuiz={() => navigate('/', { state: { openModal: 'quiz' } })}
        onRanking={() => navigate('/ranking')}
        onOptions={() => navigate('/', { state: { openModal: 'options' } })}
      />
    </div>
  );
}
