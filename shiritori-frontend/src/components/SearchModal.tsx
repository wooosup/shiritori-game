import { useState } from 'react';
import { apiClient } from '../api/axios';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface WordSearchResult {
    word: string;
    reading: string;
    meaning: string;
    level?: string | null;
}

export default function SearchModal({ isOpen, onClose }: Props) {
    const [keyword, setKeyword] = useState('');
    const [result, setResult] = useState<WordSearchResult | null>(null);
    const [shake, setShake] = useState(false); // 🫨 흔들림 효과용 상태

    const handleClose = () => {
        setKeyword('');
        setResult(null);
        setShake(false);
        onClose();
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyword.trim()) return;

        try {
            const res = await apiClient.get(`/words/search?keyword=${keyword}`);
            setResult(res.data.data);
        } catch {
            setResult(null);

            setShake(true);
            setTimeout(() => setShake(false), 500); // 0.5초 뒤에 멈춤
        }
    };

    const getLevelBadgeColor = (level?: string | null) => {
        if (!level) return '';

        if (level === 'N1') return 'bg-red-100 text-red-600';
        if (level === 'N5') return 'bg-green-100 text-green-600';
        return 'bg-blue-100 text-blue-600';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-2xl relative animate-scaleUp">
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition">✕</button>

                <h2 className="text-xl font-bold text-gray-800 mb-4">📖 단어 사전</h2>

                <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="단어를 검색해보세요"
                        className={`flex-1 p-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200
                            ${shake
                            ? 'border-red-300 ring-2 ring-red-100 animate-shake'
                            : 'border-gray-300 focus:ring-indigo-500'
                        }`}
                    />
                    <button
                        type="submit"
                        className="bg-indigo-600 text-white px-4 rounded-xl font-bold hover:bg-indigo-700 transition whitespace-nowrap shrink-0"
                    >
                        검색
                    </button>
                </form>

                {/* 결과 영역: 결과가 없으면 그냥 초기 안내 문구만 뜸 (에러 메시지 X) */}
                <div className="bg-gray-50 rounded-xl p-4 min-h-[120px] flex items-center justify-center text-center border border-gray-100">
                    {result ? (
                        <div className="text-left w-full animate-fadeIn">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl font-black text-indigo-600">{result.word}</span>
                                {result.level && result.level !== 'null' && (
                                    <span className={`text-xs px-2 py-1 rounded font-bold ${getLevelBadgeColor(result.level)}`}>
                                        {result.level}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-1">
                                <p className="text-gray-500 text-sm">
                                    <span className="font-bold text-gray-400 mr-2">읽기</span>
                                    {result.reading}
                                </p>
                                <p className="text-gray-800 font-medium">
                                    <span className="font-bold text-gray-400 mr-2">뜻</span>
                                    {result.meaning}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-400 flex flex-col items-center gap-2">
                            <span className="text-2xl">🔍</span>
                            <span className="text-sm">검색 결과가 여기에 표시됩니다.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
