import { useState, useEffect } from 'react';
import { apiClient } from '../api/axios';

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

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function WordBookModal({ isOpen, onClose }: Readonly<Props>) {
    const [words, setWords] = useState<WordBookItem[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [shake, setShake] = useState(false);

    const [showReading, setShowReading] = useState(true);
    const [showMeaning, setShowMeaning] = useState(true);

    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchWords();
            setInputText('');
            setErrorMsg(null);
            // 모달 열 때마다 보이기 상태 초기화 (원하면 제거 가능)
            setShowReading(true);
            setShowMeaning(true);
            setDeleteTargetId(null)
        }
    }, [isOpen]);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const fetchWords = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<ApiResponse<WordBookItem[]>>('/wordBooks');
            if (res.data.code === 200) {
                setWords(res.data.data);
            }
        } catch (error: any) {
            console.error(error);
            if (error.response?.status === 401) {
                alert("로그인이 필요합니다.");
                onClose();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddWord = async () => {
        if (!inputText.trim()) return;
        setSubmitting(true);
        setErrorMsg(null);

        try {
            const res = await apiClient.post<ApiResponse<WordBookItem>>('/wordBooks', {
                word: inputText
            });
            if (res.data.code === 200) {
                setInputText('');
                fetchWords();
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || "추가 실패";
            setErrorMsg(msg);
            triggerShake();
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (deleteTargetId === null) return;

        try {
            await apiClient.delete(`/wordBooks/${deleteTargetId}`);
            setWords(prev => prev.filter(item => item.id !== deleteTargetId));
            setDeleteTargetId(null);
        } catch (error) {
            setErrorMsg("삭제 중 오류가 발생했습니다.");
            triggerShake();
            setDeleteTargetId(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddWord();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);
        if (errorMsg) setErrorMsg(null);
    };

    const getLevelBadgeColor = (level?: string) => {
        switch (level) {
            case 'N1': return 'bg-red-100 text-red-600';
            case 'N5': return 'bg-green-100 text-green-600';
            default: return 'bg-blue-100 text-blue-600';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4">
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20% { transform: translateX(-4px); }
                    40% { transform: translateX(4px); }
                    60% { transform: translateX(-2px); }
                    80% { transform: translateX(2px); }
                }
                .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
            `}</style>

            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl relative animate-scaleUp flex flex-col max-h-[85vh]">

                {/* 헤더 */}
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                        📒 나만의 단어장
                        <span className="text-xs font-normal text-gray-500 bg-white border px-2 py-0.5 rounded-full">
                            {words.length}개
                        </span>
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>

                {/* 입력창 & 컨트롤 바 */}
                <div className="p-4 bg-white z-10 flex flex-col gap-4 shadow-sm">
                    {/* 입력 그룹 */}
                    <div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                placeholder="단어를 추가하세요"
                                disabled={submitting}
                                className={`
                                    flex-1 p-3 border rounded-xl focus:outline-none transition-all duration-200
                                    ${errorMsg
                                    ? 'border-red-500 bg-red-50 text-red-600 placeholder:text-red-300 focus:ring-2 focus:ring-red-200'
                                    : 'border-gray-200 focus:ring-2 focus:ring-indigo-500 bg-gray-50'
                                }
                                    ${shake ? 'animate-shake' : ''}
                                `}
                            />
                            <button
                                onClick={handleAddWord}
                                disabled={submitting || !inputText.trim()}
                                className="bg-indigo-600 text-white px-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
                            >
                                +
                            </button>
                        </div>
                        {errorMsg && (
                            <p className="text-xs text-red-500 font-bold mt-2 ml-1 animate-fadeIn flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                </svg>
                                {errorMsg}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowReading(!showReading)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border
                                ${showReading
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                                : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                            }`}
                        >
                            {showReading ? '😐 히라가나 켜짐' : '😑 히라가나 꺼짐'}
                        </button>
                        <button
                            onClick={() => setShowMeaning(!showMeaning)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border
                                ${showMeaning
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                                : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                            }`}
                        >
                            {showMeaning ? '😐️ 뜻 켜짐' : '😑 뜻 꺼짐'}
                        </button>
                    </div>
                </div>

                {/* 리스트 (스크롤 영역) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 border-t border-gray-100">
                    {loading ? (
                        <div className="text-center py-10 text-gray-400">로딩 중...</div>
                    ) : words.length > 0 ? (
                        words.map((item) => (
                            <div key={item.id}>
                                {/* ✨ [수정] 삭제 모드인지 확인하여 UI 분기 */}
                                {deleteTargetId === item.id ? (
                                    // 🗑️ 삭제 확인 UI
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-inner flex items-center justify-between animate-fadeIn">
                                        <span className="text-red-500 font-bold text-sm flex items-center gap-2">
                                            ⚠️ 정말 삭제할까요?
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setDeleteTargetId(null)}
                                                className="px-3 py-1.5 bg-white text-gray-500 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50"
                                            >
                                                취소
                                            </button>
                                            <button
                                                onClick={confirmDelete}
                                                className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 shadow-sm"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // 📄 일반 단어 UI
                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center group hover:shadow-md transition">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-lg text-gray-800">{item.word}</span>
                                                {item.level && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${getLevelBadgeColor(item.level)}`}>
                                                        {item.level}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-sm flex items-center gap-2 mt-1">
                                                <span
                                                    className={`transition-all duration-300 rounded px-1
                                                        ${showReading
                                                        ? 'text-gray-500'
                                                        : 'bg-slate-200 text-transparent select-none cursor-pointer hover:bg-slate-100 hover:text-gray-400'
                                                    }`}
                                                    title={!showReading ? "클릭하거나 마우스를 올리면 보입니다" : ""}
                                                >
                                                    {item.reading}
                                                </span>

                                                <span className="text-gray-300">|</span>

                                                <span
                                                    className={`transition-all duration-300 rounded px-1 font-bold
                                                        ${showMeaning
                                                        ? 'text-indigo-600'
                                                        : 'bg-slate-200 text-transparent select-none cursor-pointer hover:bg-slate-100 hover:text-indigo-400'
                                                    }`}
                                                    title={!showMeaning ? "클릭하거나 마우스를 올리면 보입니다" : ""}
                                                >
                                                    {item.meaning}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setDeleteTargetId(item.id)} // ✨ 바로 삭제하지 않고 삭제 모드로 변경
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                                            title="삭제"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-gray-400 flex flex-col items-center">
                            <span className="text-3xl mb-2">🍃</span>
                            <span>저장된 단어가 없습니다.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}