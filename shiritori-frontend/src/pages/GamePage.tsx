import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/axios';
import { JapaneseUtils } from '../utils/japanese';
import { ShieldCheckIcon, ArrowRightIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';// ✅ 백엔드 응답 타입

interface TurnResponse {
    status: 'PLAYING' | 'WIN' | 'GAME_OVER';
    userWord: string | null;
    userReading: string | null;
    aiWord: string | null;
    aiReading: string | null;
    aiMeaning: string | null;
    currentScore: number;
    currentCombo: number;
    message: string;
    remainingPass: number;
}

// ✅ 메시지 타입
interface Message {
    id: number;
    sender: 'AI' | 'USER';
    word?: string;
    reading?: string;
    meaning?: string;
    message?: string;
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
    const [passCount, setPassCount] = useState(3);

    // UI 상태
    const [showPassModal, setShowPassModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState(20);
    const [isGameOver, setIsGameOver] = useState(false);
    const [gameResult, setGameResult] = useState<{ type: 'WIN' | 'LOSE', msg: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [shake, setShake] = useState(false);

    const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success' | 'error'}>({
        show: false, msg: '', type: 'success'
    });
    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const isGameStarted = useRef(false);

    // --- 초기화 ---
    useEffect(() => {
        if (isGameStarted.current) return;
        isGameStarted.current = true;
        startGame();
    }, []);

    // --- 뷰포트 대응 ---
    useEffect(() => {
        const handleResize = () => {
            if (viewportRef.current && window.visualViewport) {
                const currentHeight = window.visualViewport.height;
                viewportRef.current.style.height = `${currentHeight}px`;
                viewportRef.current.style.minHeight = `${currentHeight}px`;
                window.scrollTo(0, 0);
                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
                }, 50);
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            window.visualViewport.addEventListener('scroll', handleResize);
            handleResize();
        } else {
            window.addEventListener('resize', handleResize);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
                window.visualViewport.removeEventListener('scroll', handleResize);
            } else {
                window.removeEventListener('resize', handleResize);
            }
        };
    }, []);

    // --- 타이머 ---
    useEffect(() => {
        if (isGameOver || !gameId) return;
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

    // --- 스크롤 ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [history, loading]);

    // --- 에러 메시지 ---
    useEffect(() => {
        if (errorMessage) {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            const timer = setTimeout(() => setErrorMessage(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    const handleSaveWord = async (word: string) => {
        try {
            const res = await apiClient.post('/wordBooks', { word });
            if (res.data.code === 200) {
                showToast("단어장에 저장했습니다.", 'success');
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || "저장에 실패했습니다.";
            if (msg.includes("이미")) {
                showToast("이미 단어장에 있는 단어입니다.", 'error');
            } else {
                showToast(msg, 'error');
            }
        }
    };

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 2000);
    };

    const startGame = async () => {
        try {
            setLoading(true);
            const res = await apiClient.post('/games/start', { level });
            if (res.data.code === 200) {
                const data = res.data.data;
                setGameId(data.gameId);
                setCombo(0);
                setScore(0);
                setPassCount(3);
                addMessage({
                    id: Date.now(),
                    sender: 'AI',
                    word: data.word,
                    reading: data.startReading,
                    meaning: data.meaning,
                });
            }
        } catch (error) {
            alert('게임 시작 실패!');
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const handlePassClick = () => {
        if (passCount <= 0 || loading || isGameOver) return;
        setShowPassModal(true);
    };

    const confirmPass = async () => {
        setShowPassModal(false);
        setLoading(true);

        try {
            const res = await apiClient.post(`/games/${gameId}/pass`);
            const data: TurnResponse = res.data.data;

            // 상태 업데이트
            setPassCount(data.remainingPass);
            setInputWord('');
            setTimeLeft(20);

            const newMessages: Message[] = [];

            if (data.aiWord) {
                newMessages.push({
                    id: Date.now(),
                    sender: 'AI',
                    word: data.aiWord,
                    reading: data.aiReading || '',
                    meaning: data.aiMeaning || '',
                    message: data.message
                });
            }

            setHistory(prev => [...prev, ...newMessages]);
            inputRef.current?.focus();

        } catch (error) {
            console.error(error);
            setErrorMessage("PASS 처리에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleTimeOver = async () => {
        if (isGameOver) return;
        setIsGameOver(true);
        setGameResult({ type: 'LOSE', msg: '⏰ 시간 초과!' });
        try {
            if (gameId) await apiClient.post(`/games/${gameId}/turn`, {gameId, word: 'TIME_OVER_SIGNAL'});
        } catch (e) { console.error("시간 초과 처리 에러", e); }
    };

    const handleQuit = async () => {
        if (gameId && !isGameOver) {
            try { await apiClient.post(`/games/${gameId}/quit`); }
            catch (e) { console.error("포기 에러", e); }
        }
        navigate('/');
    };

    const addMessage = (msg: Omit<Message, 'id'> & { id?: number }) => {
        setHistory((prev) => [...prev, { ...msg, id: msg.id || Date.now() }]);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputWord(e.target.value);
        if (errorMessage) setErrorMessage(null);
    };

    const checkWordIsValid = (word: string): string | null => {
        if (history.length === 0) return '⏳ 게임 준비 중...';
        const gameMessages = history;
        let cleanInput = word.trim().normalize("NFC");
        cleanInput = cleanInput.replaceAll(/[\u30a1-\u30f6]/g, (match) => String.fromCodePoint(match.charCodeAt(0) - 0x60));

        const isDuplicate = gameMessages.some((msg) => msg.word?.normalize("NFC") === cleanInput);
        if (isDuplicate) return '이미 입력한 단어입니다.';
        const isKanaOnly = /^[ぁ-んァ-ンー]+$/.test(cleanInput);
        if (!isKanaOnly) return null;

        const lastMessage = gameMessages.at(-1);
        if (lastMessage?.sender === 'AI' && lastMessage.word) {
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
                if (cleanInput.startsWith(combinedSound) || cleanInput.startsWith(combinedSeion) || normBig === normFirst) isValid = true;
                else expectedStart = `${bigKana} 또는 ${combinedSeion}`;
            } else {
                const normLast = JapaneseUtils.normalizeForCheck(lastChar);
                const normFirst = JapaneseUtils.normalizeForCheck(firstChar);
                if (normLast === normFirst) isValid = true;
                else expectedStart = JapaneseUtils.toBigKana(JapaneseUtils.toSeion(lastChar));
            }
            if (!isValid) return `'${expectedStart}'(으)로 시작해야 합니다.`;
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isGameOver || loading) return;
        if (!inputWord.trim()) return;

        const userInput = inputWord.trim();
        const error = checkWordIsValid(userInput);
        if (error) { setErrorMessage(error); return; }

        addMessage({ sender: 'USER', word: userInput, reading: userInput });
        setInputWord('');
        setErrorMessage(null);
        setLoading(true);
        inputRef.current?.focus();

        try {
            const res = await apiClient.post(`/games/${gameId}/turn`, { gameId, word: userInput });
            const data: TurnResponse = res.data.data;
            setScore(data.currentScore);
            setCombo(data.currentCombo);

            // 💡 [중요] 일반 턴에서도 패스 횟수 동기화
            if (data.remainingPass !== undefined) setPassCount(data.remainingPass);

            if (data.status === 'PLAYING') {
                addMessage({ sender: 'AI', word: data.aiWord!, reading: data.aiReading!, meaning: data.aiMeaning! });
                setTimeLeft(20);
            } else {
                setIsGameOver(true);
                const isWin = data.status === 'WIN';
                setGameResult({ type: isWin ? 'WIN' : 'LOSE', msg: data.message });
                inputRef.current?.blur();
            }
        } catch (error: any) {
            setHistory(prev => prev.slice(0, -1));
            if (error.response?.status === 429) { setErrorMessage("⛔ 너무 빨라요!"); return; }
            const serverMsg = error.response?.data?.message || '오류가 발생했습니다.';
            setErrorMessage(serverMsg);
            setInputWord(userInput);
        } finally { setLoading(false); }
    };

    const handleChatClick = () => { if (!isGameOver) inputRef.current?.focus(); };

    return (
        <div className="fixed inset-0 w-full h-full bg-slate-50 font-sans overflow-hidden touch-none">
            {/* CSS & 모달 스타일 */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap');
                .font-jp { font-family: 'Noto Sans JP', sans-serif; }
                html, body { position: fixed; width: 100%; height: 100%; overflow: hidden; overscroll-behavior: none; }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-2px); } 80% { transform: translateX(2px); } }
                .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
                @keyframes bounceIn { 0% { transform: scale(0.9); opacity: 0; } 60% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(1); } }
                .animate-bounceIn { animation: bounceIn 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28); }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-100%); } to { opacity: 1; transform: translateY(0); } }
                .animate-slideDown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>

            <div ref={viewportRef} className="fixed top-0 left-0 w-full max-w-md mx-auto bg-white shadow-2xl flex flex-col relative border-x border-gray-200" style={{ height: '100%' }}>

                {toast.show && (
                    <div className="absolute top-20 left-0 w-full flex justify-center z-[60] pointer-events-none animate-slideDown">
                        <div className="bg-zinc-800/95 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-3 backdrop-blur-md">
                            {toast.type === 'success' ? (
                                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                            ) : (
                                <ExclamationCircleIcon className="w-5 h-5 text-amber-400" />
                            )}
                            <span className="text-sm font-medium tracking-tight">{toast.msg}</span>
                        </div>
                    </div>
                )}

                {/* 1. 헤더 */}
                <header className="flex-none flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md z-10 sticky top-0 border-b border-gray-50">
                    <div>
                        <span className="text-[10px] text-gray-400 font-extrabold tracking-widest block mb-0.5">LEVEL</span>
                        <span className="text-xl font-black text-slate-700">{level}</span>
                    </div>

                    {errorMessage && (
                        <div className="absolute top-16 left-0 w-full text-center z-50 pointer-events-none">
                            <span className="inline-block text-red-500 font-bold text-sm bg-white/95 px-4 py-1.5 rounded-full shadow-lg animate-bounce border border-red-100">{errorMessage}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handlePassClick}
                            disabled={passCount <= 0 || loading || isGameOver}
                            className={`
                                flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-all border
                                ${passCount > 0
                                ? 'bg-orange-50 border-orange-100 text-orange-500 hover:bg-orange-100 active:scale-95'
                                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-70'}
                            `}
                        >
                            <span className="text-[9px] font-extrabold tracking-widest leading-none mb-0.5">PASS</span>
                            <span className="text-lg font-black leading-none">{passCount}</span>
                        </button>

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
                    <div className={`h-full transition-all duration-1000 ease-linear rounded-r-full ${timeLeft < 5 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-indigo-500'}`} style={{ width: `${(timeLeft / 20) * 100}%` }} />
                </div>

                {/* 2. 채팅 영역 */}
                <main onClick={handleChatClick} className="flex-1 px-5 py-6 overflow-y-auto bg-slate-50 space-y-6" style={{ overscrollBehavior: 'contain' }}>
                    {history.map((msg, i) => {
                        const isAi = msg.sender === 'AI';

                        return (
                            <div key={i} className={`flex w-full ${!isAi ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex flex-col max-w-[75%] ${!isAi ? 'items-end' : 'items-start'}`}>
                                    {msg.message && <div className="text-[10px] font-bold text-indigo-400 mb-1 pl-1">{msg.message}</div>}

                                    <div
                                        onClick={() => isAi && msg.word ? handleSaveWord(msg.word) : null}
                                        className={`
                                            relative px-6 py-4 shadow-sm font-jp transition-all duration-300 
                                            ${isAi
                                            ? 'bg-white text-slate-700 border border-gray-100 rounded-[24px] rounded-tl-sm cursor-pointer group hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-md active:scale-95'
                                            : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-[24px] rounded-tr-sm hover:scale-[1.02]'
                                        }
                                        `}
                                        title={isAi ? "클릭해서 단어장에 저장하세요!" : ""}
                                    >
                                        {/* AI 말풍선 호버 시 북마크 아이콘 표시 */}
                                        {isAi && (
                                            <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm scale-75 animate-bounce">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                                    <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}

                                        {msg.reading && msg.word !== msg.reading && <div className={`text-[11px] font-medium mb-1 tracking-wide ${isAi ? 'text-indigo-500' : 'text-indigo-100 opacity-90'}`}>{msg.reading}</div>}
                                        <div className="text-xl font-black tracking-wider leading-none">{msg.word}</div>
                                    </div>
                                    {msg.meaning && <span className={`text-[11px] font-bold text-gray-400 mt-2 px-2 ${isAi ? 'text-left' : 'text-right'}`}>{msg.meaning}</span>}
                                </div>
                            </div>
                        );
                    })}
                    {loading && (
                        <div className="flex w-full justify-start">
                            <div className="bg-white px-6 py-5 shadow-sm border border-gray-100 rounded-[24px] rounded-tl-sm"><div className="flex gap-1.5"><div className="w-2 h-2 bg-indigo-300 rounded-full animate-[bounce_1s_infinite_0ms]"></div><div className="w-2 h-2 bg-indigo-300 rounded-full animate-[bounce_1s_infinite_200ms]"></div><div className="w-2 h-2 bg-indigo-300 rounded-full animate-[bounce_1s_infinite_400ms]"></div></div></div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>

                <footer className="flex-none p-5 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
                    <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
                        <input ref={inputRef} type="text" value={inputWord} onChange={handleInputChange} disabled={isGameOver} placeholder={isGameOver ? "게임이 종료되었습니다" : "단어를 입력하세요..."} className={`w-full h-14 pl-6 pr-14 rounded-2xl bg-gray-50 border-2 text-lg font-jp font-bold outline-none transition-all placeholder:text-gray-300 shadow-inner ${shake ? 'border-red-300 bg-red-50 text-red-500 placeholder:text-red-300 animate-shake' : 'border-transparent focus:border-indigo-500 focus:bg-white focus:shadow-lg focus:shadow-indigo-100'}`} />
                        <button type="submit" disabled={isGameOver || loading} className={`absolute right-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${loading ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-95'}`}>
                            {loading ? <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"/> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>}
                        </button>
                    </form>
                </footer>

                {/* 🌟 4. [수정됨] 깔끔한 인디고 테마의 패스 모달 */}
                {showPassModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-[4px] p-4 animate-fadeIn">
                        <div className="bg-white w-full max-w-[320px] p-6 rounded-[32px] shadow-2xl flex flex-col items-center text-center animate-bounceIn border border-white/50">

                            {/* 상단 아이콘 */}
                            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <ShieldCheckIcon className="w-7 h-7 text-indigo-500" />
                            </div>

                            {/* 타이틀 */}
                            <h3 className="text-xl font-black text-slate-800 mb-2">PASS를 쓸까요?</h3>
                            <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">
                                AI가 대신 이어가줍니다.
                            </p>

                            {/* 횟수 차감 비주얼 */}
                            <div className="flex items-center justify-center gap-4 mb-8 bg-slate-50 w-full py-4 rounded-2xl border border-slate-100">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 mb-0.5">BEFORE</span>
                                    <span className="text-xl font-bold text-gray-500">{passCount}</span>
                                </div>
                                <ArrowRightIcon className="w-5 h-5 text-gray-300" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-indigo-400 mb-0.5">AFTER</span>
                                    <span className="text-2xl font-black text-indigo-600">{passCount - 1}</span>
                                </div>
                            </div>

                            {/* 버튼 그룹 */}
                            <div className="flex w-full gap-3">
                                <button
                                    onClick={() => setShowPassModal(false)}
                                    className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition active:scale-95 text-sm"
                                >
                                    아니오
                                </button>
                                <button
                                    onClick={confirmPass}
                                    className="flex-1 py-3.5 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition active:scale-95 text-sm"
                                >
                                    사용하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 결과 모달 */}
                {isGameOver && gameResult && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-6 animate-fadeIn">
                        <div className="bg-white p-8 rounded-[32px] shadow-2xl text-center animate-bounceIn w-full max-w-sm">
                            <div className="text-6xl mb-4 drop-shadow-sm">{gameResult.type === 'WIN' ? '🎉' : '💀'}</div>
                            <h2 className="text-3xl font-black mb-3 text-slate-800 tracking-tight">{gameResult.type === 'WIN' ? 'YOU WIN!' : 'GAME OVER'}</h2>
                            <p className="text-gray-500 font-medium mb-8 bg-gray-50 py-2 rounded-lg">{gameResult.msg}</p>
                            <div className="bg-indigo-50 p-6 rounded-2xl mb-8 border border-indigo-100">
                                <div className="text-xs text-indigo-400 font-extrabold tracking-widest mb-1">FINAL SCORE</div>
                                <div className="text-4xl font-black text-indigo-600 tracking-tighter">{score.toLocaleString()}</div>
                            </div>
                            <button onClick={() => navigate('/')} className="w-full py-4 bg-slate-900 text-white font-bold text-lg rounded-2xl hover:bg-slate-800 transition shadow-xl shadow-slate-200 active:scale-95">메인으로 돌아가기</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}