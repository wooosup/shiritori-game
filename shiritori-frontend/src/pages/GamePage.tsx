import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/axios';
import { JapaneseUtils } from '../utils/japanese';

// ✅ 백엔드 응답 타입
interface TurnResponse {
    status: 'PLAYING' | 'WIN' | 'GAME_OVER';
    userWord: string;
    userReading: string;
    aiWord: string;
    aiReading: string;
    aiMeaning: string;
    currentScore: number;
    currentCombo: number;
    message: string;
}

interface Message {
    sender: 'AI' | 'USER';
    word: string;
    reading?: string;
    meaning?: string;
    isError?: boolean;
}

export default function GamePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const level = location.state?.level || 'N5';

    // 게임 상태
    const [gameId, setGameId] = useState<number | null>(null);
    const [history, setHistory] = useState<Message[]>([]);
    const [inputWord, setInputWord] = useState('');

    // 타이머 20초
    const [timeLeft, setTimeLeft] = useState(20);

    const [isGameOver, setIsGameOver] = useState(false);
    const [gameResult, setGameResult] = useState<{ type: 'WIN' | 'LOSE', msg: string } | null>(null);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);

    // 입력창 흔들림 효과
    const [shake, setShake] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isGameStarted = useRef(false);

    // --- 초기화 ---
    useEffect(() => {
        if (isGameStarted.current) return;
        isGameStarted.current = true;
        startGame();
    }, []);

    // --- 타이머 ---
    useEffect(() => {
        if (isGameOver) return;
        if (!gameId) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeOver();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isGameOver, gameId]);

    // --- 스크롤 자동 이동 ---
    useEffect(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
    }, [history, loading]);

    // --- 에러 메시지 2초 뒤 사라짐 ---
    useEffect(() => {
        if (errorMessage) {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            const timer = setTimeout(() => setErrorMessage(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    const startGame = async () => {
        try {
            setLoading(true);
            const res = await apiClient.post('/games/start', { level });
            if (res.data.code === 200) {
                const data = res.data.data;
                setGameId(data.gameId);
                setCombo(0);
                addMessage('AI', data.word, data.startReading, '끝말잇기');
            }
        } catch (error) {
            alert('게임 시작 실패!');
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const handleTimeOver = async () => {
        if (isGameOver) return;

        setIsGameOver(true);
        setGameResult({ type: 'LOSE', msg: '⏰ 시간 초과!' });
        try {
            if (gameId) {
                await apiClient.post(`/games/${gameId}/turn`, { gameId, word: 'TIME_OVER_SIGNAL' });
                console.log("시간 초과 신호 전송 성공:", gameId);
            } else {
                console.error("gameId가 없어서 시간 초과 요청을 못 보냈습니다.");
            }
        } catch (e) {
            console.log("시간 초과 처리 중 오류 (무시됨)");
        }
    };

    const handleQuit = async () => {
        if (gameId && !isGameOver) {
            try {
                await apiClient.post(`/games/${gameId}/quit`);
                console.log("게임 포기 요청 전송");
            } catch (e) {
                console.error("포기 처리 중 에러(무시됨)", e);
            }
        }
        navigate('/');
    };

    const addMessage = (sender: 'AI' | 'USER', word: string, reading?: string, meaning?: string) => {
        const safeWord = word || "???";
        const safeReading = reading || safeWord;
        setHistory((prev) => [...prev, { sender, word: safeWord, reading: safeReading, meaning }]);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputWord(e.target.value);
        if (errorMessage) setErrorMessage(null);
    };

    // 모바일 키보드 대응 스크롤
    const handleInputFocus = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 300);
    };

    // 유효성 검사
    const checkWordIsValid = (word: string): string | null => {
        if (history.length === 0) return '⏳ 게임 준비 중...';

        let cleanInput = word.trim().normalize("NFC");
        cleanInput = cleanInput.replace(/[\u30a1-\u30f6]/g, (match) =>
            String.fromCharCode(match.charCodeAt(0) - 0x60)
        );

        const isDuplicate = history.some((msg) => msg.word.normalize("NFC") === cleanInput);
        if (isDuplicate) return '이미 입력한 단어입니다.';

        const isKanaOnly = /^[ぁ-んァ-ンー]+$/.test(cleanInput);
        if (!isKanaOnly) return null;

        const lastMessage = history.at(-1);
        if (lastMessage?.sender === 'AI') {
            const targetText = lastMessage.reading || lastMessage.word;
            const lastChar = targetText.slice(-1);
            const prevChar = targetText.slice(-2, -1);
            const firstChar = cleanInput.charAt(0);

            let isValid = false;
            let expectedStart = "";

            if (JapaneseUtils.isSmallKana(lastChar) && prevChar) {
                const combinedSound = prevChar + lastChar;
                const prevSeion = JapaneseUtils.toSeion(prevChar);
                const combinedSeion = prevSeion + lastChar;
                const bigKana = JapaneseUtils.toBigKana(lastChar);
                const normBig = JapaneseUtils.normalizeForCheck(bigKana);
                const normFirst = JapaneseUtils.normalizeForCheck(firstChar);

                if (cleanInput.startsWith(combinedSound) ||
                    cleanInput.startsWith(combinedSeion) ||
                    normBig === normFirst) {
                    isValid = true;
                } else {
                    expectedStart = `${bigKana} 또는 ${combinedSeion}`;
                }
            } else {
                const normLast = JapaneseUtils.normalizeForCheck(lastChar);
                const normFirst = JapaneseUtils.normalizeForCheck(firstChar);
                if (normLast === normFirst) {
                    isValid = true;
                } else {
                    expectedStart = JapaneseUtils.toBigKana(JapaneseUtils.toSeion(lastChar));
                }
            }

            if (!isValid) {
                return `'${expectedStart}'(으)로 시작해야 합니다.`;
            }
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isGameOver || loading) return;
        if (!inputWord.trim()) return;

        const userInput = inputWord.trim();
        const error = checkWordIsValid(userInput);

        if (error) {
            setErrorMessage(error);
            return;
        }

        // 1. 메시지 추가
        addMessage('USER', userInput, userInput);
        setInputWord('');
        setErrorMessage(null);
        setLoading(true);

        try {
            // 2. 서버 요청
            const res = await apiClient.post(`/games/${gameId}/turn`, { gameId, word: userInput });
            const data: TurnResponse = res.data.data;

            // 3. 서버 응답 처리
            // 내 메시지는 이미 추가했으므로 생략하고, 점수와 AI 메시지만 처리
            setScore(data.currentScore);
            setCombo(data.currentCombo);

            if (data.status === 'PLAYING') {
                // AI 답변 추가
                addMessage('AI', data.aiWord, data.aiReading, data.aiMeaning);
                setTimeLeft(20);
            } else {
                setIsGameOver(true);
                setGameResult({
                    type: data.status === 'WIN' ? 'WIN' : 'LOSE',
                    msg: data.message
                });
            }

        } catch (error: any) {
            setHistory(prev => prev.slice(0, -1));

            if (error.response?.status === 429) {
                setErrorMessage("⛔ 너무 빨라요! 천천히 입력해주세요.");
                return;
            }

            const serverMsg = error.response?.data?.message || '오류가 발생했습니다.';
            setErrorMessage(serverMsg);
            setInputWord(userInput); // 입력했던 단어 다시 채워주기
        } finally {
            setLoading(false); // 로딩 끝
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 font-sans">

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap');
                .font-jp { font-family: 'Noto Sans JP', sans-serif; }
            `}</style>

            <div className="w-full max-w-md h-[100dvh] bg-white shadow-2xl flex flex-col overflow-hidden relative border-x border-gray-200">

                {/* 헤더 */}
                <header className="flex-none flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md z-10 sticky top-0 border-b border-gray-50">
                    <div>
                        <span className="text-[10px] text-gray-400 font-extrabold tracking-widest block mb-0.5">LEVEL</span>
                        <span className="text-xl font-black text-slate-700">{level}</span>
                    </div>

                    {errorMessage && (
                        <div className="absolute top-16 left-0 w-full text-center z-50 pointer-events-none">
                            <span className="inline-block text-red-500 font-bold text-sm bg-white/95 px-4 py-1.5 rounded-full shadow-lg animate-bounce border border-red-100">
                                {errorMessage}
                            </span>
                        </div>
                    )}

                    <div className="flex gap-4">
                        {combo > 1 && (
                            <div className="flex flex-col items-end animate-[pulse_1s_ease-in-out_infinite]">
                                <span className="text-[10px] text-orange-500 font-extrabold tracking-widest">COMBO</span>
                                <span className="text-2xl font-black text-orange-500 italic leading-none">{combo}</span>
                            </div>
                        )}
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-400 font-extrabold tracking-widest block mb-0.5">SCORE</span>
                            <span className="text-2xl font-black text-indigo-600 leading-none">{score.toLocaleString()}</span>
                        </div>
                    </div>

                    <button onClick={handleQuit} className="absolute top-4 left-20 p-2 text-gray-300 hover:text-red-500 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                    </button>
                </header>

                {/* 타이머 바 */}
                <div className="flex-none w-full h-1.5 bg-gray-100">
                    <div
                        className={`h-full transition-all duration-1000 ease-linear rounded-r-full ${timeLeft < 5 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-indigo-500'}`}
                        style={{ width: `${(timeLeft / 20) * 100}%` }}
                    />
                </div>

                {/* 채팅 영역 */}
                <main className="flex-1 px-5 py-6 overflow-y-auto bg-slate-50 space-y-6">
                    {history.map((msg, i) => (
                        <div key={i} className={`flex w-full ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>

                            <div className={`flex flex-col max-w-[75%] ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}>

                                <div className={`
                                    relative px-6 py-4 shadow-sm font-jp transition-all duration-300 hover:scale-[1.02]
                                    ${msg.sender === 'USER'
                                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-[24px] rounded-tr-sm'
                                    : 'bg-white text-slate-700 border border-gray-100 rounded-[24px] rounded-tl-sm'}
                                `}>
                                    {msg.reading && msg.word !== msg.reading && (
                                        <div className={`text-[11px] font-medium mb-1 tracking-wide
                                            ${msg.sender === 'USER' ? 'text-indigo-100 opacity-90' : 'text-indigo-500'}
                                        `}>
                                            {msg.reading}
                                        </div>
                                    )}

                                    <div className="text-xl font-black tracking-wider leading-none">
                                        {msg.word}
                                    </div>
                                </div>

                                {msg.meaning && (
                                    <span className={`text-[11px] font-bold text-gray-400 mt-2 px-2
                                        ${msg.sender === 'USER' ? 'text-right' : 'text-left'}
                                    `}>
                                        {msg.meaning}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* 🤖 3. AI 생각 중 표시 (Loading Bubble) */}
                    {loading && (
                        <div className="flex w-full justify-start">
                            <div className="flex flex-col max-w-[75%] items-start">
                                <div className="bg-white px-6 py-5 shadow-sm border border-gray-100 rounded-[24px] rounded-tl-sm">
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 bg-indigo-300 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
                                        <div className="w-2 h-2 bg-indigo-300 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                                        <div className="w-2 h-2 bg-indigo-300 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-indigo-300 mt-2 px-2">
                                    생각하는 중...
                                </span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </main>

                {/* 입력창 */}
                <footer className="flex-none p-5 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
                    <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
                        <input
                            type="text"
                            value={inputWord}
                            onChange={handleInputChange}
                            onFocus={handleInputFocus}
                            disabled={isGameOver}
                            placeholder={isGameOver ? "게임이 종료되었습니다" : "단어를 입력하세요..."}
                            className={`
                                w-full h-14 pl-6 pr-14 rounded-2xl bg-gray-50 border-2 text-lg font-jp font-bold outline-none transition-all placeholder:text-gray-300 shadow-inner
                                ${shake
                                ? 'border-red-300 bg-red-50 text-red-500 placeholder:text-red-300 animate-shake'
                                : 'border-transparent focus:border-indigo-500 focus:bg-white focus:shadow-lg focus:shadow-indigo-100'}
                            `}
                        />
                        <button
                            type="submit"
                            disabled={isGameOver || loading}
                            className={`
                                absolute right-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
                                ${loading
                                ? 'bg-gray-100 text-gray-400'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-95'}
                            `}
                        >
                            {/* 로딩 중엔 버튼도 스피너로 변경 */}
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"/>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                </svg>
                            )}
                        </button>
                    </form>
                </footer>

                {/* 결과 모달 */}
                {isGameOver && gameResult && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-6">
                        <div className="bg-white p-8 rounded-[32px] shadow-2xl text-center animate-bounceIn w-full max-w-sm">
                            <div className="text-6xl mb-4 drop-shadow-sm">{gameResult.type === 'WIN' ? '🎉' : '💀'}</div>
                            <h2 className="text-3xl font-black mb-3 text-slate-800 tracking-tight">{gameResult.type === 'WIN' ? 'YOU WIN!' : 'GAME OVER'}</h2>
                            <p className="text-gray-500 font-medium mb-8 bg-gray-50 py-2 rounded-lg">{gameResult.msg}</p>

                            <div className="bg-indigo-50 p-6 rounded-2xl mb-8 border border-indigo-100">
                                <div className="text-xs text-indigo-400 font-extrabold tracking-widest mb-1">FINAL SCORE</div>
                                <div className="text-4xl font-black text-indigo-600 tracking-tighter">{score.toLocaleString()}</div>
                            </div>

                            <button onClick={() => navigate('/')} className="w-full py-4 bg-slate-900 text-white font-bold text-lg rounded-2xl hover:bg-slate-800 transition shadow-xl shadow-slate-200 active:scale-95">
                                메인으로 돌아가기
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-4px); }
                    40% { transform: translateX(4px); }
                    60% { transform: translateX(-2px); }
                    80% { transform: translateX(2px); }
                }
                .animate-shake {
                    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes bounceIn {
                    0% { transform: scale(0.9); opacity: 0; }
                    60% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1); }
                }
                .animate-bounceIn {
                    animation: bounceIn 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28);
                }
            `}</style>
        </div>
    );
}