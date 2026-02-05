interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function RuleModal({ isOpen, onClose }: Readonly<Props>) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl m-4 border border-gray-100 relative animate-scaleUp">
                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <h2 className="text-2xl font-black text-indigo-600 mb-6 flex items-center gap-2">
                    <span>📜</span> 게임 규칙
                </h2>

                <div className="space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed">
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <p className="font-bold text-indigo-800 mb-2">🎯 기본 룰</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                            <li>AI와 번갈아가며 단어를 이어가세요.</li>
                            <li>제한시간 <span className="font-bold text-indigo-600">20초</span> 내에 입력해야 해요.</li>
                            <li>사전에 등록된 <span className="font-bold text-indigo-600">명사</span>만 가능합니다.</li>
                        </ul>
                    </div>

                    <ul className="list-disc pl-5 space-y-2 marker:text-indigo-400">
                        <li>
                            <span className="font-bold text-red-500">패배 조건:</span>
                            단어가 <span className="font-bold bg-red-100 px-1 rounded">'ん'</span>으로 끝나면 패배합니다.
                        </li>
                        <li>
                            <span className="font-bold text-blue-500">입력:</span>
                            히라가나, 가타카나, 한자 모두 가능합니다.<br/>
                            <span className="text-xs text-gray-500">(자동으로 히라가나로 변환되어 체크됩니다)</span>
                        </li>
                        <li>
                            <span className="font-bold">장음(ー):</span>
                            앞 글자의 모음으로 이어가면 됩니다.<br/>
                            <span className="text-xs text-gray-500">ex) コーヒー → 다음 글자는 'ひ'</span>
                        </li>
                        <li>
                            <span className="font-bold">요음(ゃ,ゅ,ょ):</span>
                            그대로 큰 글자 또는 붙여서도 가능합니다.<br/>
                            <span className="text-xs text-gray-500">ex) 医者(いしゃ) → 다음 글자는 'や' 또는 'しゃ'</span>
                        </li>
                        <li>
                            <span className="font-bold">촉음, 탁음(ぶ、ぷ):</span>
                            상관없이 이어가면 됩니다.<br/>
                            <span className="text-xs text-gray-500">ex) カップ → 다음 글자는 'ふ', 'ぷ', 'ぶ'</span>
                        </li>
                    </ul>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition active:scale-95"
                >
                    확인
                </button>
            </div>
        </div>
    );
}