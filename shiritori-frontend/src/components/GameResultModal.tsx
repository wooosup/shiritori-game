import {
  ArrowPathIcon,
  BookOpenIcon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';

export interface GameResultWord {
  word: string;
  reading?: string;
  meaning?: string;
  saved?: boolean;
  highlight?: string;
}

export type GameResultType = 'win' | 'lose';

interface GameResultModalProps {
  isOpen: boolean;
  resultType: GameResultType;
  message: string;
  score: number;
  combo: number;
  isNewRecord?: boolean;
  words: GameResultWord[];
  isSavingWord?: string | null;
  onSaveWord: (word: string) => void;
  onPlayAgain: () => void;
  onGoHome: () => void;
  onOpenReviewQuiz: () => void;
  onViewWordBook: () => void;
  reviewTitle?: string;
  reviewSubtitle?: string;
  onClose: () => void;
}

export default function GameResultModal({
  isOpen,
  resultType,
  message,
  score,
  combo,
  isNewRecord = false,
  words,
  isSavingWord,
  onSaveWord,
  onPlayAgain,
  onGoHome,
  onOpenReviewQuiz,
  onViewWordBook,
  reviewTitle,
  reviewSubtitle,
  onClose,
}: Readonly<GameResultModalProps>) {
  if (!isOpen) {
    return null;
  }

  const title = resultType === 'win' ? 'YOU WIN!' : 'GAME OVER';
  const accent = resultType === 'win' ? 'from-emerald-500 to-lime-500' : 'from-rose-500 to-orange-500';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="닫기"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>

        <div className="text-center">
          <SparklesIcon className={`mx-auto h-12 w-12 text-gradient bg-gradient-to-r ${accent}`} />
          <p className="mt-3 text-sm font-black tracking-[0.5em] text-gray-400 uppercase">결과</p>
          <h2 className="mt-1 text-4xl font-black">{title}</h2>
          <p className="text-gray-500 dark:text-slate-300">{message}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-center">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase">최종 점수</p>
            <p className="mt-2 text-3xl font-black text-indigo-600 dark:text-indigo-300">{score.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase">최대 콤보</p>
            <p className="mt-2 text-3xl font-black text-orange-500 dark:text-orange-400">{combo}</p>
          </div>
        </div>

        {isNewRecord ? (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-white shadow-lg">
            <TrophyIcon className="h-4 w-4" />
            신규 기록 달성
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.4em] text-gray-400">
              <span>이번 판 단어</span>
              <span>{words.length}개</span>
            </div>
            <div className="mt-3 space-y-3 max-h-48 overflow-y-auto pr-1">
              {words.map((wordEntry) => (
                <div
                  key={wordEntry.word}
                  className={`flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 text-sm font-bold text-gray-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${wordEntry.highlight ? 'animate-pulse' : ''}`}
                >
                  <div>
                    <div className="text-lg flex items-center gap-2">
                      {wordEntry.word}
                      {wordEntry.highlight ? (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-600">
                          {wordEntry.highlight}
                        </span>
                      ) : null}
                    </div>
                    {wordEntry.reading || wordEntry.meaning ? (
                      <p className="text-[11px] font-normal text-gray-400 dark:text-slate-400">
                        {wordEntry.reading ?? ''} {wordEntry.meaning ? `· ${wordEntry.meaning}` : ''}
                      </p>
                    ) : null}
                  </div>
                  {wordEntry.saved ? (
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500">저장됨</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSaveWord(wordEntry.word)}
                      disabled={isSavingWord === wordEntry.word}
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em] transition ${
                        isSavingWord === wordEntry.word
                          ? 'cursor-wait border border-indigo-100 bg-indigo-50 text-indigo-400'
                          : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      <BookOpenIcon className="h-3 w-3" />
                      저장
                    </button>
                  )}
                </div>
              ))}
              {words.length === 0 ? (
                <p className="text-center text-xs font-semibold text-gray-400 dark:text-slate-400">이번 판에는 읽을 단어가 없습니다.</p>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
              {reviewTitle ?? '복습 추천'}
            </p>
            <p className="mt-1 text-sm font-bold text-gray-700 dark:text-gray-200">
              {reviewSubtitle ?? '저장되지 않은 단어와 퀴즈로 복습하세요.'}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onOpenReviewQuiz}
                className="flex-1 rounded-2xl border border-indigo-100 bg-indigo-100 py-2 text-xs font-black uppercase tracking-[0.4em] text-indigo-700 transition hover:bg-indigo-200"
              >
                퀴즈로 복습
              </button>
              <button
                type="button"
                onClick={onViewWordBook}
                className="flex-1 rounded-2xl border border-gray-200 bg-white py-2 text-xs font-black uppercase tracking-[0.4em] text-gray-700 transition hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                단어장 보기
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 rounded-2xl bg-indigo-600 py-3 text-sm font-black uppercase tracking-[0.3em] text-white shadow-lg transition hover:bg-indigo-700"
          >
            다시 하기
          </button>
          <button
            type="button"
            onClick={onGoHome}
            className="flex-1 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-black uppercase tracking-[0.3em] text-gray-700 transition hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            메인으로
          </button>
        </div>
      </div>
    </div>
  );
}
