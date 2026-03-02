import type { Ranking } from '../pages/Home';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    rankings: Ranking[];
    loading: boolean;
}

export default function RankingModal({ isOpen, onClose, rankings, loading }: Readonly<Props>) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-2xl m-4 border border-indigo-100 relative animate-scaleUp max-h-[80vh] flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-gray-400 hover:text-indigo-600 transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 className="text-2xl font-black text-indigo-600 mb-6 flex items-center gap-2 flex-none">
                    <span>👑</span> 랭킹
                </h2>

                <div className="overflow-y-auto flex-1 pr-1">
                    <ul className="divide-y divide-gray-100">
                        {rankings.length > 0 ? (
                            rankings.map((rank, index) => (
                                <li key={index} className="flex items-center justify-between py-4 hover:bg-gray-50 transition-colors rounded-xl px-2">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 text-center text-lg font-black">
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : <span className="text-gray-400 text-sm">{index + 1}</span>}
                                        </span>
                                        <div>
                                            <div className="font-bold text-gray-800 text-sm">{rank.nickname}</div>
                                            <div className="text-xs text-gray-400 font-medium mt-0.5">
                                                {rank.maxCombo}콤보
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-black text-indigo-600 text-base">
                                        {rank.score.toLocaleString()}
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="p-8 text-center text-gray-400 font-medium text-sm">
                                {loading ? '순위를 불러오는 중...' : '아직 랭킹 데이터가 없습니다.'}
                            </li>
                        )}
                    </ul>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-6 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-md hover:bg-indigo-700 transition active:scale-95 flex-none"
                >
                    닫기
                </button>
            </div>
        </div>
    );
}
