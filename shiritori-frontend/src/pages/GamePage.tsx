import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { apiClient } from '../api/axios';
import { getApiErrorMessage, getApiErrorStatus } from '../api/error';
import GameResultModal, { type GameResultType, type GameResultWord } from '../components/GameResultModal';
import { useShiritoriValidation } from '../hooks/useShiritoriValidation';
import { ShieldCheckIcon, ArrowRightIcon, CheckCircleIcon, ExclamationCircleIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/solid';// ✅ 백엔드 응답 타입
import { playComboSfx, playErrorSfx, playGameResultSfx, playSuccessSfx } from '../sound/effects';
import { isNativeApp } from '../platform/runtime';
import { captureError, trackEvent } from '../lib/telemetry';
import './GamePage.css';

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

type PauseReason = 'manual' | 'background';
type ResultHistoryMessage = Message | Omit<Message, 'id'>;

interface GameLocationState {
    level?: string;
    previousBestScore?: number;
    previousBestCombo?: number;
}

interface GameResultState {
    type: GameResultType;
    msg: string;
    score: number;
    maxCombo: number;
    isNewRecord: boolean;
    words: GameResultWord[];
}

interface GameSnapshot {
    version: number;
    savedAt: number;
    level: string;
    gameId: number;
    history: Message[];
    passCount: number;
    timeLeft: number;
    score: number;
    combo: number;
    bestCombo: number;
    inputWord: string;
}

const TURN_TIME_LIMIT = 20;
const SNAPSHOT_STORAGE_KEY = 'shiritori:active-game:v1';
const SNAPSHOT_MAX_AGE_MS = 1000 * 60 * 30;

function normalizeSubmitErrorMessage(message: string, status?: number): string {
    if (status === 429) {
        return '⛔ 너무 빨라요! 잠시만 기다려주세요.';
    }
    if (message.includes('이미 사용된 단어')) {
        return '이미 사용한 단어예요. 다른 단어를 입력해 주세요.';
    }
    if (message.includes('사전에 없는 단어')) {
        return '사전에 없는 단어예요. 다른 단어를 입력해 주세요.';
    }
    if (message.includes('끝말이 이어지지')) {
        return '끝말이 이어지지 않아요. 마지막 글자를 확인해 주세요.';
    }
    if (message.includes('PASS 기회를 모두 소진')) {
        return 'PASS 기회를 모두 사용했어요.';
    }
    return message;
}

function isExpiredSessionError(message: string, status?: number): boolean {
    return status === 404 || message.includes('이미 종료된 게임') || message.includes('존재하지 않는 게임 세션');
}

function parseSnapshot(raw: string | null): GameSnapshot | null {
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as Partial<GameSnapshot>;
        if (
            parsed.version !== 1 ||
            typeof parsed.savedAt !== 'number' ||
            typeof parsed.level !== 'string' ||
            typeof parsed.gameId !== 'number' ||
            !Array.isArray(parsed.history)
        ) {
            return null;
        }

        return {
            version: 1,
            savedAt: parsed.savedAt,
            level: parsed.level,
            gameId: parsed.gameId,
            history: parsed.history as Message[],
            passCount: typeof parsed.passCount === 'number' ? parsed.passCount : 3,
            timeLeft: typeof parsed.timeLeft === 'number' ? parsed.timeLeft : TURN_TIME_LIMIT,
            score: typeof parsed.score === 'number' ? parsed.score : 0,
            combo: typeof parsed.combo === 'number' ? parsed.combo : 0,
            bestCombo: typeof parsed.bestCombo === 'number'
                ? parsed.bestCombo
                : (typeof parsed.combo === 'number' ? parsed.combo : 0),
            inputWord: typeof parsed.inputWord === 'string' ? parsed.inputWord : '',
        };
    } catch {
        return null;
    }
}

function extractPlayedWords(history: ResultHistoryMessage[]): GameResultWord[] {
    const seenWords = new Set<string>();

    return history
        .filter((message) => message.sender === 'USER' && typeof message.word === 'string' && message.word.trim().length > 0)
        .map((message) => ({
            word: message.word as string,
            reading: message.reading,
        }))
        .filter((entry) => {
            if (seenWords.has(entry.word)) {
                return false;
            }
            seenWords.add(entry.word);
            return true;
        });
}

function isBetterRecord(score: number, combo: number, previousBestScore: number, previousBestCombo: number): boolean {
    return score > previousBestScore || (score === previousBestScore && combo > previousBestCombo);
}

export default function GamePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = (location.state as GameLocationState | null) ?? null;
    const level = locationState?.level || 'N5';

    // 게임 상태
    const [gameId, setGameId] = useState<number | null>(null);
    const [history, setHistory] = useState<Message[]>([]);
    const [inputWord, setInputWord] = useState('');
    const [passCount, setPassCount] = useState(3);

    // UI 상태
    const [showPassModal, setShowPassModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState(TURN_TIME_LIMIT);
    const [isGameOver, setIsGameOver] = useState(false);
    const [gameResult, setGameResult] = useState<GameResultState | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [bestCombo, setBestCombo] = useState(0);
    const [shake, setShake] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [pauseReason, setPauseReason] = useState<PauseReason | null>(null);
    const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
    const [savingResultWord, setSavingResultWord] = useState<string | null>(null);
    const [bestRecordBaseline, setBestRecordBaseline] = useState(() => ({
        score: typeof locationState?.previousBestScore === 'number' ? locationState.previousBestScore : 0,
        maxCombo: typeof locationState?.previousBestCombo === 'number' ? locationState.previousBestCombo : 0,
    }));

    const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success' | 'error'}>({
        show: false, msg: '', type: 'success'
    });
    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const comboBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isGameStarted = useRef(false);
    const previousComboRef = useRef(0);
    const { validateWord } = useShiritoriValidation(history);
    const [comboBurstActive, setComboBurstActive] = useState(false);

    const clearSnapshot = useCallback(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
    }, []);

    const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, msg, type });
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = setTimeout(() => {
            setToast({ show: false, msg: '', type: 'success' });
            toastTimerRef.current = null;
        }, 2000);
    }, []);

    const pauseGame = useCallback((reason: PauseReason) => {
        if (isGameOver || !gameId || isPaused) return;
        setIsPaused(true);
        setPauseReason(reason);
        setResumeCountdown(null);
        if (reason === 'background') {
            showToast('앱이 백그라운드로 전환되어 일시정지되었어요.', 'error');
        }
    }, [gameId, isGameOver, isPaused, showToast]);

    const startResumeCountdown = useCallback(() => {
        if (!isPaused || isGameOver || loading) return;
        setResumeCountdown(3);
    }, [isGameOver, isPaused, loading]);

    const handlePauseToggle = () => {
        if (isGameOver || loading || !gameId) return;
        if (isPaused) {
            startResumeCountdown();
            return;
        }
        pauseGame('manual');
    };

    const restoreSnapshot = useCallback((): boolean => {
        if (typeof window === 'undefined') return false;
        const snapshot = parseSnapshot(window.localStorage.getItem(SNAPSHOT_STORAGE_KEY));
        if (!snapshot) {
            clearSnapshot();
            return false;
        }
        if (snapshot.level !== level) {
            return false;
        }
        if (Date.now() - snapshot.savedAt > SNAPSHOT_MAX_AGE_MS) {
            clearSnapshot();
            return false;
        }

        setGameId(snapshot.gameId);
        setHistory(snapshot.history);
        setPassCount(snapshot.passCount);
        setTimeLeft(snapshot.timeLeft);
        setScore(snapshot.score);
        setCombo(snapshot.combo);
        setBestCombo(snapshot.bestCombo);
        previousComboRef.current = snapshot.combo;
        setComboBurstActive(false);
        setInputWord(snapshot.inputWord);
        setIsPaused(true);
        setPauseReason('background');
        setResumeCountdown(3);
        showToast('이전 게임을 복구했어요.', 'success');

        return true;
    }, [clearSnapshot, level, showToast]);

    const addMessage = useCallback((msg: Omit<Message, 'id'> & { id?: number }) => {
        setHistory((prev) => [...prev, { ...msg, id: msg.id || Date.now() }]);
    }, []);

    const finalizeGame = useCallback((
        resultType: GameResultType,
        message: string,
        finalScore: number,
        finalBestCombo: number,
        historySnapshot: ResultHistoryMessage[],
    ) => {
        const isNewRecord = isBetterRecord(
            finalScore,
            finalBestCombo,
            bestRecordBaseline.score,
            bestRecordBaseline.maxCombo,
        );

        setGameResult({
            type: resultType,
            msg: message,
            score: finalScore,
            maxCombo: finalBestCombo,
            isNewRecord,
            words: extractPlayedWords(historySnapshot),
        });

        if (isNewRecord || finalBestCombo > bestRecordBaseline.maxCombo) {
            setBestRecordBaseline((previous) => ({
                score: Math.max(previous.score, finalScore),
                maxCombo: Math.max(previous.maxCombo, finalBestCombo),
            }));
        }
    }, [bestRecordBaseline.maxCombo, bestRecordBaseline.score]);

    const startGame = useCallback(async () => {
        try {
            setLoading(true);
            setIsGameOver(false);
            setGameResult(null);
            setErrorMessage(null);
            setHistory([]);
            setInputWord('');
            setIsPaused(false);
            setPauseReason(null);
            setResumeCountdown(null);
            setSavingResultWord(null);
            previousComboRef.current = 0;
            setComboBurstActive(false);
            clearSnapshot();

            const res = await apiClient.post('/games/start', { level });
            if (res.data.code === 200) {
                const data = res.data.data;
                trackEvent('game_started', { level, gameId: data.gameId });
                setGameId(data.gameId);
                setCombo(0);
                setBestCombo(0);
                setScore(0);
                setPassCount(3);
                setTimeLeft(TURN_TIME_LIMIT);
                addMessage({
                    id: Date.now(),
                    sender: 'AI',
                    word: data.word,
                    reading: data.startReading,
                    meaning: data.meaning,
                });
                setTimeout(() => inputRef.current?.focus(), 10);
            }
        } catch (error: unknown) {
            captureError(error, { action: 'game_start', level });
            showToast('게임 시작에 실패해 홈으로 이동합니다.', 'error');
            setTimeout(() => {
                navigate('/');
            }, 800);
        } finally {
            setLoading(false);
        }
    }, [addMessage, clearSnapshot, level, navigate, showToast]);

    const handleTimeOver = useCallback(async () => {
        if (isGameOver) return;
        const finalBestCombo = Math.max(bestCombo, combo);
        setIsGameOver(true);
        finalizeGame('lose', '⏰ 시간 초과!', score, finalBestCombo, history);
        trackEvent('game_ended', { level, result: 'timeout', score, combo: finalBestCombo });
        clearSnapshot();
        try {
            if (gameId) await apiClient.post(`/games/${gameId}/timeout`);
        } catch (e) {
            console.error("시간 초과 처리 에러", e);
            captureError(e, { action: 'game_timeout', level });
        }
    }, [bestCombo, clearSnapshot, combo, finalizeGame, gameId, history, isGameOver, level, score]);

    // --- 초기화 ---
    useEffect(() => {
        if (isGameStarted.current) return;
        isGameStarted.current = true;
        const restored = restoreSnapshot();
        if (!restored) {
            startGame();
        }
    }, [restoreSnapshot, startGame]);

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
        if (isGameOver || !gameId || isPaused || resumeCountdown !== null) return;
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
    }, [gameId, handleTimeOver, isGameOver, isPaused, resumeCountdown]);

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

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                clearTimeout(toastTimerRef.current);
            }
            if (comboBurstTimerRef.current) {
                clearTimeout(comboBurstTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const previousCombo = previousComboRef.current;
        if (combo > previousCombo) {
            if (combo > 1) {
                playComboSfx();
                setComboBurstActive(true);
                if (comboBurstTimerRef.current) {
                    clearTimeout(comboBurstTimerRef.current);
                }
                comboBurstTimerRef.current = setTimeout(() => {
                    setComboBurstActive(false);
                    comboBurstTimerRef.current = null;
                }, 900);
            } else {
                playSuccessSfx();
            }
        } else if (combo === 0) {
            setComboBurstActive(false);
        }

        previousComboRef.current = combo;
    }, [combo]);

    useEffect(() => {
        if (!gameResult) {
            return;
        }

        playGameResultSfx(gameResult.type);
    }, [gameResult]);

    // --- 복귀 카운트다운 ---
    useEffect(() => {
        if (resumeCountdown === null) return;
        if (resumeCountdown <= 0) {
            setResumeCountdown(null);
            setIsPaused(false);
            setPauseReason(null);
            setTimeLeft((prev) => (prev <= 0 ? TURN_TIME_LIMIT : prev));
            inputRef.current?.focus();
            return;
        }

        const timer = setTimeout(() => {
            setResumeCountdown((prev) => (prev === null ? null : prev - 1));
        }, 1000);

        return () => clearTimeout(timer);
    }, [resumeCountdown]);

    // --- 앱 전환 자동 일시정지 ---
    useEffect(() => {
        const handleBackground = () => {
            pauseGame('background');
        };

        const handleActive = () => {
            if (pauseReason === 'background' && isPaused && resumeCountdown === null && !isGameOver) {
                startResumeCountdown();
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'hidden') {
                handleBackground();
                return;
            }
            handleActive();
        };

        document.addEventListener('visibilitychange', handleVisibility);

        let disposeNativeListener: (() => void) | null = null;
        if (isNativeApp()) {
            CapacitorApp.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                    handleActive();
                } else {
                    handleBackground();
                }
            }).then((listener) => {
                disposeNativeListener = () => {
                    void listener.remove();
                };
            }).catch(() => {});
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            disposeNativeListener?.();
        };
    }, [isGameOver, isPaused, pauseGame, pauseReason, resumeCountdown, startResumeCountdown]);

    // --- 진행 중 게임 스냅샷 저장 ---
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!gameId || isGameOver) {
            clearSnapshot();
            return;
        }

        const snapshot: GameSnapshot = {
            version: 1,
            savedAt: Date.now(),
            level,
            gameId,
            history,
            passCount,
            timeLeft,
            score,
            combo,
            bestCombo,
            inputWord,
        };

        window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
    }, [bestCombo, clearSnapshot, level, gameId, history, passCount, timeLeft, score, combo, inputWord, isGameOver]);

    const handleSaveWord = async (word: string, source: 'game_chat' | 'game_result' = 'game_result') => {
        setSavingResultWord(word);
        try {
            const res = await apiClient.post('/wordBooks', { word });
            if (res.data.code === 200) {
                trackEvent('wordbook_saved', { source, level });
                showToast("단어장에 저장했습니다.", 'success');
            }
        } catch (error: unknown) {
            captureError(error, { action: 'wordbook_save', source, level });
            const msg = getApiErrorMessage(error, "저장에 실패했습니다.");
            if (msg.includes("이미")) {
                showToast("이미 단어장에 있는 단어입니다.", 'error');
            } else {
                showToast(msg, 'error');
            }
        } finally {
            setSavingResultWord((current) => (current === word ? null : current));
        }
    };

    const handlePassClick = () => {
        if (passCount <= 0 || loading || isGameOver || isPaused || resumeCountdown !== null) return;
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
            setTimeLeft(TURN_TIME_LIMIT);

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

        } catch (error: unknown) {
            const serverMsg = getApiErrorMessage(error, 'PASS 처리에 실패했습니다.');
            const status = getApiErrorStatus(error);
            if (isExpiredSessionError(serverMsg, status)) {
                showToast('게임 세션이 만료되어 새 게임으로 시작합니다.', 'error');
                await startGame();
                return;
            }
            setErrorMessage(normalizeSubmitErrorMessage(serverMsg, status));
        } finally {
            setLoading(false);
        }
    };

    const handleQuit = async () => {
        if (gameId && !isGameOver) {
            trackEvent('game_ended', { level, result: 'quit', score, combo });
            try { await apiClient.post(`/games/${gameId}/quit`); }
            catch (e) {
                console.error("포기 에러", e);
                captureError(e, { action: 'game_quit', level });
            }
        }
        clearSnapshot();
        navigate('/');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputWord(e.target.value);
        if (errorMessage) setErrorMessage(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isGameOver || loading || isPaused || resumeCountdown !== null) return;
        if (!inputWord.trim()) return;

        const userInput = inputWord.trim();
        const error = validateWord(userInput);
        if (error) {
            playErrorSfx();
            setErrorMessage(error);
            return;
        }

        const userMessage: Omit<Message, 'id'> = { sender: 'USER', word: userInput, reading: userInput };
        addMessage(userMessage);
        setInputWord('');
        setErrorMessage(null);
        setLoading(true);
        inputRef.current?.focus();

        try {
            const res = await apiClient.post(`/games/${gameId}/turn`, { gameId, word: userInput });
            const data: TurnResponse = res.data.data;
            setScore(data.currentScore);
            setCombo(data.currentCombo);
            const nextBestCombo = Math.max(bestCombo, data.currentCombo);
            setBestCombo(nextBestCombo);

            // 💡 [중요] 일반 턴에서도 패스 횟수 동기화
            if (data.remainingPass !== undefined) setPassCount(data.remainingPass);

            if (data.status === 'PLAYING') {
                addMessage({ sender: 'AI', word: data.aiWord!, reading: data.aiReading!, meaning: data.aiMeaning! });
                setTimeLeft(TURN_TIME_LIMIT);
            } else {
                setIsGameOver(true);
                const isWin = data.status === 'WIN';
                trackEvent('game_ended', {
                    level,
                    result: isWin ? 'win' : 'lose',
                    score: data.currentScore,
                    combo: nextBestCombo,
                });
                finalizeGame(
                    isWin ? 'win' : 'lose',
                    data.message,
                    data.currentScore,
                    nextBestCombo,
                    [...history, userMessage],
                );
                inputRef.current?.blur();
                clearSnapshot();
            }
        } catch (error: unknown) {
            setHistory(prev => prev.slice(0, -1));
            const serverMsg = getApiErrorMessage(error, '오류가 발생했습니다.');
            const status = getApiErrorStatus(error);

            if (isExpiredSessionError(serverMsg, status)) {
                captureError(error, { action: 'game_turn_session_expired', level, status });
                showToast('게임 세션이 만료되어 새 게임으로 시작합니다.', 'error');
                await startGame();
                return;
            }

            if (status !== undefined && status >= 400 && status < 500 && status !== 401 && status !== 403) {
                playErrorSfx();
            }
            if (status === undefined || status >= 500) {
                captureError(error, { action: 'game_turn', level, status });
            }
            setErrorMessage(normalizeSubmitErrorMessage(serverMsg, status));
            setInputWord(userInput);
        } finally { setLoading(false); }
    };

    const handlePlayAgain = () => {
        void startGame();
    };

    const handleGoHome = () => {
        clearSnapshot();
        navigate('/');
    };

    const handleChatClick = () => {
        if (!isGameOver && !isPaused && resumeCountdown === null) {
            inputRef.current?.focus();
        }
    };

    return (
        <div className="h-[100dvh] w-full bg-[#F7F7F9] dark:bg-slate-950 flex flex-col items-center overflow-hidden relative touch-none font-sans">
            <div ref={viewportRef} className="w-full max-w-md h-full flex flex-col bg-white dark:bg-slate-900 relative shadow-2xl overflow-hidden border-x border-gray-100 dark:border-slate-700">

                {/* 토스트 메시지 */}
                {toast.show && (
                    <div className="absolute top-20 left-0 w-full flex justify-center z-[60] pointer-events-none animate-slideDown">
                        <div className="bg-gray-900/90 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-3 backdrop-blur-md">
                            {toast.type === 'success' ? (
                                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                            ) : (
                                <ExclamationCircleIcon className="w-5 h-5 text-amber-400" />
                            )}
                            <span className="text-sm font-bold tracking-tight">{toast.msg}</span>
                        </div>
                    </div>
                )}

                {/* 에러 메시지 팝업 */}
                {errorMessage && (
                    <div className="absolute top-32 left-0 w-full flex justify-center z-50 pointer-events-none animate-bounceIn">
                        <div className="bg-red-500 text-white px-5 py-2.5 rounded-full shadow-xl border border-red-400 font-bold text-sm flex items-center gap-2">
                            <ExclamationCircleIcon className="w-5 h-5 text-white" />
                            {errorMessage}
                        </div>
                    </div>
                )}

                {/* 1. 상단 헤더 (App Bar) */}
                <header className="flex-none bg-white dark:bg-slate-900 pt-safe-top shadow-sm z-20 relative">
                    <div className="h-16 px-4 flex justify-between items-center border-b border-gray-50 dark:border-slate-700">
                        
                        {/* 좌측: 뒤로가기 + 레벨 표시 + 패스 버튼 */}
                        <div className="flex items-center gap-2">
                            <button onClick={handleQuit} className="p-2 -ml-2 text-gray-400 hover:text-red-500 transition active:scale-95">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                                </svg>
                            </button>
                            <div className="flex flex-col items-start ml-1 mr-3">
                                <span className="text-[10px] text-gray-400 font-black tracking-widest mb-0.5">난이도</span>
                                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 leading-none">{level}</span>
                            </div>
                            
                            {/* 패스 버튼 (심플하고 세련된 디자인) */}
                            <button
                                onClick={handlePassClick}
                                disabled={passCount <= 0 || loading || isGameOver || isPaused || resumeCountdown !== null}
                                className={`
                                    h-9 flex items-center justify-center gap-1.5 px-3.5 rounded-xl transition-all font-bold text-xs border
                                    ${passCount > 0 && !isPaused && resumeCountdown === null
                                    ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700'
                                    : 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-500'}
                                `}
                            >
                                <span className="tracking-widest">PASS</span>
                                <div className={`w-4 h-4 flex items-center justify-center rounded-full text-[10px] ${passCount > 0 ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-gray-200 text-gray-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                                    {passCount}
                                </div>
                            </button>
                        </div>

                        {/* 우측 정보 (콤보, 스코어) */}
                        <div className="flex items-center gap-4">
                            {/* 일시정지 버튼 (심플하고 세련된 디자인) */}
                            <button
                                onClick={handlePauseToggle}
                                disabled={!gameId || isGameOver || loading || resumeCountdown !== null}
                                className={`
                                    w-9 h-9 flex items-center justify-center rounded-xl transition-all border
                                    ${!gameId || isGameOver || loading || resumeCountdown !== null
                                        ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-500'
                                        : isPaused
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 active:scale-95 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'}
                                `}
                                aria-label={isPaused ? '재개하기' : '일시정지'}
                            >
                                {isPaused ? <PlayIcon className="w-4 h-4 ml-0.5" /> : <PauseIcon className="w-4 h-4" />}
                            </button>

                            {combo > 1 && (
                                <div className={`flex flex-col items-end ${comboBurstActive ? 'animate-[pulse_0.9s_cubic-bezier(0.16,1,0.3,1)]' : ''}`}>
                                    <span className="text-[9px] text-orange-500 font-black tracking-widest mb-0.5">콤보</span>
                                    <span className="text-xl font-black text-orange-500 italic leading-none">{combo}</span>
                                </div>
                            )}
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-gray-400 font-black tracking-widest mb-0.5">점수</span>
                                <span className="text-2xl font-black text-indigo-600 leading-none">{score.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* 타이머 진행 바 */}
                    <div className="w-full h-1.5 bg-gray-100 relative overflow-hidden">
                        <div 
                            className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-linear rounded-r-full ${isPaused ? 'bg-amber-400' : timeLeft < 5 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} 
                            style={{ width: `${(timeLeft / TURN_TIME_LIMIT) * 100}%` }} 
                        />
                    </div>
                </header>

                {/* 2. 채팅/게임 진행 영역 */}
                <main onClick={handleChatClick} className="flex-1 px-4 py-6 overflow-y-auto bg-[#F7F7F9] dark:bg-slate-950 space-y-5" style={{ overscrollBehavior: 'contain' }}>
                    {history.map((msg, i) => {
                        const isAi = msg.sender === 'AI';

                        return (
                            <div key={i} className={`flex w-full ${!isAi ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                                <div className={`flex flex-col max-w-[80%] ${!isAi ? 'items-end' : 'items-start'}`}>
                                    {/* AI 말풍선 위젯 메시지 */}
                                    {msg.message && (
                                        <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:border-indigo-700 dark:bg-indigo-900/55 dark:text-indigo-200">
                                            <span className="text-[10px] font-black tracking-wide">SYSTEM</span>
                                            <span>{msg.message}</span>
                                        </div>
                                    )}

                                    {/* 말풍선 본체 */}
                                    <div
                                        onClick={() => isAi && msg.word ? handleSaveWord(msg.word, 'game_chat') : null}
                                        className={`
                                            relative px-5 py-3 shadow-sm font-jp transition-all duration-300
                                            ${isAi
                                            ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 border border-gray-100 dark:border-slate-700 rounded-3xl rounded-tl-sm cursor-pointer group hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md active:scale-95'
                                            : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl rounded-tr-sm shadow-md'
                                        }
                                        `}
                                        title={isAi ? "클릭해서 단어장에 저장하세요!" : ""}
                                    >
                                        {/* AI 단어장 저장 북마크 아이콘 (호버 시) */}
                                        {isAi && (
                                            <div className="absolute -top-2 -right-2 bg-yellow-400 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm scale-75 animate-bounce">
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                    <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* 요미가나 (읽는 법) */}
                                        {msg.reading && msg.word !== msg.reading && (
                                            <div className={`text-[11px] font-bold mb-0.5 tracking-wide ${isAi ? 'text-indigo-500' : 'text-indigo-200 opacity-90'}`}>
                                                {msg.reading}
                                            </div>
                                        )}
                                        {/* 메인 단어 */}
                                        <div className="text-2xl font-black tracking-wider leading-none">{msg.word}</div>
                                    </div>
                                    
                                    {/* 뜻 (의미) */}
                                    {msg.meaning && (
                                        <span className={`text-xs font-bold text-gray-400 mt-1.5 px-2 ${isAi ? 'text-left' : 'text-right'}`}>
                                            {msg.meaning}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {/* 로딩 인디케이터 (AI 타이핑 중...) */}
                    {loading && (
                        <div className="flex w-full justify-start animate-fadeIn">
                            <div className="bg-white dark:bg-slate-800 px-5 py-4 shadow-sm border border-gray-100 dark:border-slate-700 rounded-3xl rounded-tl-sm flex items-center gap-1.5 h-12">
                                <div className="w-2 h-2 bg-indigo-300 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
                                <div className="w-2 h-2 bg-indigo-300 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                                <div className="w-2 h-2 bg-indigo-300 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </main>

                {/* 3. 하단 입력 영역 */}
                <footer className="flex-none p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 pb-safe-bottom z-20 shadow-[0_-8px_20px_-1px_rgba(0,0,0,0.03)]">
                    <form onSubmit={handleSubmit} className="relative flex items-center">
                        <input 
                            ref={inputRef} 
                            type="text" 
                            value={inputWord} 
                            onChange={handleInputChange} 
                            disabled={isGameOver || isPaused || resumeCountdown !== null} 
                            placeholder={
                                isGameOver
                                    ? "게임이 종료되었습니다"
                                    : isPaused
                                        ? "일시정지 중입니다"
                                        : resumeCountdown !== null
                                            ? "곧 재개됩니다..."
                                            : "단어를 입력하세요..."
                            } 
                            className={`w-full h-14 pl-5 pr-14 rounded-2xl bg-[#F7F7F9] dark:bg-slate-800 border-2 text-lg font-jp font-bold text-gray-900 dark:text-slate-100 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 ${shake ? 'border-red-300 bg-red-50 text-red-500 placeholder:text-red-300 animate-shake' : 'border-transparent focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)]'}`} 
                        />
                        <button 
                            type="submit" 
                            disabled={isGameOver || loading || !inputWord.trim() || isPaused || resumeCountdown !== null} 
                            className={`absolute right-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${!inputWord.trim() || loading || isGameOver || isPaused || resumeCountdown !== null ? 'bg-gray-200 text-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-95'}`}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                </svg>
                            )}
                        </button>
                    </form>
                </footer>

                {/* 4. 일시정지 오버레이 */}
                {isPaused && resumeCountdown === null && !isGameOver && (
                    <div className="absolute inset-0 z-[65] flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 animate-fadeIn">
                        <div className="w-full max-w-[300px] rounded-3xl bg-white p-6 text-center shadow-2xl">
                            <div className="text-4xl mb-3">⏸️</div>
                            <h3 className="text-2xl font-black text-gray-800 mb-2">일시정지</h3>
                            <p className="text-sm font-bold text-gray-500 mb-6">
                                {pauseReason === 'background'
                                    ? '앱 전환으로 자동 일시정지되었어요.'
                                    : '잠시 숨 고르고 다시 이어서 플레이하세요.'}
                            </p>
                            <button
                                onClick={startResumeCountdown}
                                className="w-full rounded-2xl bg-emerald-500 py-3 text-sm font-black text-white hover:bg-emerald-600 active:scale-95"
                            >
                                3초 후 재개
                            </button>
                        </div>
                    </div>
                )}

                {/* 5. 재개 카운트다운 */}
                {resumeCountdown !== null && !isGameOver && (
                    <div className="absolute inset-0 z-[68] flex items-center justify-center bg-black/45 backdrop-blur-md animate-fadeIn">
                        <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white/95 shadow-2xl">
                            <span className="text-6xl font-black text-indigo-600">
                                {resumeCountdown <= 0 ? 'GO' : resumeCountdown}
                            </span>
                        </div>
                    </div>
                )}

                {/* 6. PASS 모달 */}
                {showPassModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
                        <div className="bg-white w-full max-w-[320px] p-6 rounded-3xl shadow-2xl flex flex-col items-center text-center animate-bounceIn">

                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                                <ShieldCheckIcon className="w-8 h-8 text-indigo-500" />
                            </div>

                            <h3 className="text-xl font-black text-gray-800 mb-2">PASS를 쓸까요?</h3>
                            <p className="text-sm text-gray-500 font-bold mb-6">
                                AI가 대신 이어가줍니다.
                            </p>

                            <div className="flex items-center justify-center gap-5 mb-8 bg-[#F7F7F9] w-full py-4 rounded-2xl border border-gray-100">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 mb-0.5">남은 횟수</span>
                                    <span className="text-2xl font-black text-gray-600">{passCount}</span>
                                </div>
                                <ArrowRightIcon className="w-6 h-6 text-gray-300" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-indigo-500 mb-0.5">사용 후</span>
                                    <span className="text-3xl font-black text-indigo-600">{passCount - 1}</span>
                                </div>
                            </div>

                            <div className="flex w-full gap-3">
                                <button
                                    onClick={() => setShowPassModal(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition active:scale-95"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={confirmPass}
                                    className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-[0_4px_12px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition active:scale-95"
                                >
                                    사용하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isGameOver && gameResult ? (
                    <GameResultModal
                        isOpen
                        resultType={gameResult.type}
                        message={gameResult.msg}
                        score={gameResult.score}
                        combo={gameResult.maxCombo}
                        isNewRecord={gameResult.isNewRecord}
                        words={gameResult.words}
                        isSavingWord={savingResultWord}
                        onSaveWord={(word) => handleSaveWord(word, 'game_result')}
                        onPlayAgain={handlePlayAgain}
                        onGoHome={handleGoHome}
                        onClose={handleGoHome}
                    />
                ) : null}
            </div>
        </div>
    );
}
