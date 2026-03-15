import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../api/axios';
import { getApiErrorMessage } from '../api/error';

interface QuizData {
  id: number;
  question: string;
  answer: string;
  options: string[];
}

export type QuizMode = 'recent' | 'focus' | 'selected';
export type QuizLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'ALL';

export interface QuizModalPreset {
  mode?: QuizMode;
  level?: QuizLevel;
  selectedWordBookIds?: number[];
  title?: string;
  subtitle?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preset?: QuizModalPreset | null;
}

interface QuizRequestOptions {
  mode: QuizMode;
  level: QuizLevel;
  selectedWordBookIds: number[];
}

const DEFAULT_OPTIONS: QuizRequestOptions = {
  mode: 'recent',
  level: 'ALL',
  selectedWordBookIds: [],
};

const LEVEL_OPTIONS: QuizLevel[] = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'];

function resolveRequestOptions(preset?: QuizModalPreset | null): QuizRequestOptions {
  if (!preset) {
    return DEFAULT_OPTIONS;
  }

  const mode = preset.mode ?? 'recent';
  const level = preset.level ?? 'ALL';
  const selectedWordBookIds = Array.isArray(preset.selectedWordBookIds)
    ? preset.selectedWordBookIds.filter((id) => Number.isFinite(id))
    : [];

  if (mode === 'selected' && selectedWordBookIds.length === 0) {
    return {
      mode: 'focus',
      level,
      selectedWordBookIds: [],
    };
  }

  return {
    mode,
    level,
    selectedWordBookIds,
  };
}

function buildQueryParams(options: QuizRequestOptions): Record<string, string> {
  const params: Record<string, string> = {
    mode: options.mode,
  };

  if (options.mode === 'focus' && options.level !== 'ALL') {
    params.level = options.level;
  }

  if (options.mode === 'selected' && options.selectedWordBookIds.length > 0) {
    params.selectedWordBookIds = options.selectedWordBookIds.join(',');
  }

  return params;
}

export default function QuizModal({ isOpen, onClose, preset }: Readonly<Props>) {
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [requestOptions, setRequestOptions] = useState<QuizRequestOptions>(DEFAULT_OPTIONS);

  const presetKey = useMemo(() => {
    const mode = preset?.mode ?? '';
    const level = preset?.level ?? '';
    const ids = (preset?.selectedWordBookIds ?? []).join(',');
    return `${mode}|${level}|${ids}`;
  }, [preset?.level, preset?.mode, preset?.selectedWordBookIds]);

  const isPresetReview = requestOptions.mode === 'selected' && requestOptions.selectedWordBookIds.length > 0;

  const resetState = () => {
    setCurrentIndex(0);
    setScore(0);
    setFinished(false);
    setSelectedOption(null);
    setFetchError(null);
  };

  const fetchQuiz = async (options: QuizRequestOptions) => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await apiClient.get('/wordBooks/quiz', { params: buildQueryParams(options) });
      if (res.data.code === 200) {
        setQuizzes(res.data.data);
      }
    } catch (error: unknown) {
      setQuizzes([]);
      if (options.mode === 'selected') {
        setFetchError(getApiErrorMessage(error, '복습 대상 단어로 퀴즈를 만들지 못했어요.'));
      } else if (options.mode === 'focus') {
        setFetchError(getApiErrorMessage(error, '집중 복습 퀴즈를 만들지 못했어요.'));
      } else {
        setFetchError(getApiErrorMessage(error, '단어장이 비어있습니다!'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextOptions = resolveRequestOptions(preset);
    setRequestOptions(nextOptions);
    resetState();
    void fetchQuiz(nextOptions);
  }, [isOpen, preset, presetKey]);

  const handleModeChange = (nextMode: Exclude<QuizMode, 'selected'>) => {
    const nextOptions: QuizRequestOptions = {
      ...requestOptions,
      mode: nextMode,
      selectedWordBookIds: [],
    };
    setRequestOptions(nextOptions);
    resetState();
    void fetchQuiz(nextOptions);
  };

  const handleLevelChange = (nextLevel: QuizLevel) => {
    const nextOptions: QuizRequestOptions = {
      ...requestOptions,
      level: nextLevel,
    };
    setRequestOptions(nextOptions);
    resetState();
    void fetchQuiz(nextOptions);
  };

  const handleAnswer = (option: string) => {
    if (selectedOption) return;

    const correct = option === quizzes[currentIndex].answer;
    setSelectedOption(option);

    if (correct) setScore((prev) => prev + 1);

    setTimeout(() => {
      if (currentIndex < quizzes.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedOption(null);
      } else {
        setFinished(true);
      }
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden flex flex-col min-h-[400px]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          ✕
        </button>

        {isPresetReview ? (
          <div className="border-b border-indigo-100 bg-indigo-50/80 px-6 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-indigo-500">
              {preset?.title ?? '복습 퀴즈'}
            </p>
            <p className="mt-1 text-xs font-semibold text-indigo-700">
              {preset?.subtitle ?? '방금 플레이한 단어 중심으로 퀴즈를 만들었어요.'}
            </p>
          </div>
        ) : (
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('recent')}
                className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                  requestOptions.mode === 'recent'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                최근 단어
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('focus')}
                className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                  requestOptions.mode === 'focus'
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                집중 복습
              </button>
            </div>

            {requestOptions.mode === 'focus' ? (
              <div className="mt-2 grid grid-cols-6 gap-1">
                {LEVEL_OPTIONS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleLevelChange(level)}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                      requestOptions.level === level
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                        : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="animate-spin text-4xl mb-4">🌀</div>
            <p className="font-bold text-gray-500">퀴즈 생성 중...</p>
          </div>
        ) : fetchError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-xl font-black text-gray-800 mb-2">퀴즈를 불러오지 못했어요</h2>
            <p className="text-sm text-red-500 mb-6">{fetchError}</p>
            <div className="w-full grid grid-cols-2 gap-2">
              <button
                onClick={() => fetchQuiz(requestOptions)}
                className="py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
              >
                다시 시도
              </button>
              <button
                onClick={onClose}
                className="py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition"
              >
                닫기
              </button>
            </div>
          </div>
        ) : finished ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-scaleUp">
            <div className="text-6xl mb-4">{score === quizzes.length ? '💯' : score > quizzes.length / 2 ? '🎉' : '💪'}</div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">퀴즈 종료!</h2>
            <p className="text-gray-500 mb-8">
              총 <span className="font-bold text-indigo-600">{quizzes.length}문제</span> 중
              <br />
              <span className="text-3xl font-black text-indigo-600">{score}</span>개를 맞췄어요!
            </p>
            <button
              onClick={onClose}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
            >
              확인
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-6">
            <div className="w-full h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / quizzes.length) * 100}%` }}
              />
            </div>

            <div className="text-sm font-bold text-indigo-500 mb-2">
              문제 {currentIndex + 1}/{quizzes.length}
            </div>

            <div className="flex-1 flex items-center justify-center mb-8">
              <h2 className="text-3xl font-black text-gray-800 text-center leading-tight">{quizzes[currentIndex]?.question}</h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {quizzes[currentIndex]?.options.map((option, idx) => {
                let btnClass = 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100';
                if (selectedOption) {
                  if (option === quizzes[currentIndex].answer) {
                    btnClass = 'bg-green-100 border-green-300 text-green-700';
                  } else if (option === selectedOption) {
                    btnClass = 'bg-red-100 border-red-300 text-red-700';
                  } else {
                    btnClass = 'bg-gray-50 border-gray-200 text-gray-300 opacity-50';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(option)}
                    disabled={!!selectedOption}
                    className={`p-4 rounded-xl border-2 font-bold text-lg transition-all active:scale-95 ${btnClass}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
