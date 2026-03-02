import { useState, useEffect } from 'react';
import { apiClient } from '../api/axios';
import { getApiErrorMessage } from '../api/error';

interface QuizData {
    id: number;
    question: string;
    answer: string;
    options: string[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function QuizModal({ isOpen, onClose }: Readonly<Props>) {
    const [quizzes, setQuizzes] = useState<QuizData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(false);
    const [finished, setFinished] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);


    useEffect(() => {
        if (isOpen) {
            fetchQuiz();
            resetState();
        }
    }, [isOpen]);

    const resetState = () => {
        setCurrentIndex(0);
        setScore(0);
        setFinished(false);
        setSelectedOption(null);
        setFetchError(null);
    };

    const fetchQuiz = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const res = await apiClient.get('/wordBooks/quiz');
            if (res.data.code === 200) {
                setQuizzes(res.data.data);
            }
        } catch (error: unknown) {
            setQuizzes([]);
            setFetchError(getApiErrorMessage(error, '단어장이 비어있습니다!'));
        } finally {
            setLoading(false);
        }
    };

    const handleAnswer = (option: string) => {
        if (selectedOption) return;

        const correct = option === quizzes[currentIndex].answer;
        setSelectedOption(option);

        if (correct) setScore(prev => prev + 1);

        setTimeout(() => {
            if (currentIndex < quizzes.length - 1) {
                setCurrentIndex(prev => prev + 1);
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

                {/* 닫기 버튼 */}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">✕</button>

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
                                onClick={() => fetchQuiz()}
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
                    // 결과 화면
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-scaleUp">
                        <div className="text-6xl mb-4">{score === quizzes.length ? '💯' : score > quizzes.length / 2 ? '🎉' : '💪'}</div>
                        <h2 className="text-2xl font-black text-gray-800 mb-2">퀴즈 종료!</h2>
                        <p className="text-gray-500 mb-8">
                            총 <span className="font-bold text-indigo-600">{quizzes.length}문제</span> 중<br/>
                            <span className="text-3xl font-black text-indigo-600">{score}</span>개를 맞췄어요!
                        </p>
                        <button onClick={onClose} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
                            확인
                        </button>
                    </div>
                ) : (
                    // 퀴즈 화면
                    <div className="flex-1 flex flex-col p-6">
                        {/* 진행도 바 */}
                        <div className="w-full h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-300"
                                style={{ width: `${((currentIndex + 1) / quizzes.length) * 100}%` }}
                            />
                        </div>

                        <div className="text-sm font-bold text-indigo-500 mb-2">문제 {currentIndex + 1}/{quizzes.length}</div>

                        <div className="flex-1 flex items-center justify-center mb-8">
                            <h2 className="text-3xl font-black text-gray-800 text-center leading-tight">
                                {quizzes[currentIndex]?.question}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {quizzes[currentIndex]?.options.map((option, idx) => {
                                let btnClass = "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100";
                                if (selectedOption) {
                                    if (option === quizzes[currentIndex].answer) {
                                        btnClass = "bg-green-100 border-green-300 text-green-700"; // 정답 표시
                                    } else if (option === selectedOption) {
                                        btnClass = "bg-red-100 border-red-300 text-red-700"; // 내가 고른 오답 표시
                                    } else {
                                        btnClass = "bg-gray-50 border-gray-200 text-gray-300 opacity-50"; // 나머지 흐리게
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
