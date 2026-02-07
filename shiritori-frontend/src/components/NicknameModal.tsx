import { useState } from 'react';
import { apiClient } from '../api/axios';

interface Props {
    isOpen: boolean;
    onSuccess: (newNickname: string) => void;
    onClose: () => void;
    canClose: boolean;
}

export default function NicknameModal({ isOpen, onSuccess, onClose, canClose }: Readonly<Props>) {
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError('');
        setNickname(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname.trim()) { setError("닉네임을 입력해주세요."); return; }
        if (nickname.length > 10) { setError("닉네임은 10글자 이하여야 합니다."); return; }

        setLoading(true);
        try {
            await apiClient.post('/profiles/nickname', { nickname });
            onSuccess(nickname);
        } catch (err: any) {
            const msg = err.response?.data?.message || "오류가 발생했습니다.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm animate-bounce-in relative overflow-hidden">

                {canClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition p-1"
                        title="닫기"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}

                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />

                <h2 className="text-2xl font-black text-gray-800 mb-2">닉네임 설정 👋</h2>
                <p className="text-gray-500 mb-6 text-sm">
                    랭킹에 표시될 멋진 이름을 지어주세요!<br/>
                    <span className="text-xs text-indigo-500 font-bold bg-indigo-50 px-2 py-1 rounded mt-1 inline-block">
                        ℹ️ 한 번 설정하면 7일 후에 변경 가능합니다.
                    </span>
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="relative mb-4">
                        <input
                            type="text"
                            value={nickname}
                            onChange={handleNicknameChange}
                            placeholder="예: 끝말잇기고수"
                            className={`w-full p-4 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 transition-all font-bold text-lg
                                ${error ? 'border-red-300 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:ring-indigo-500'}
                            `}
                            maxLength={10}
                            autoFocus
                        />
                        <span className="absolute right-4 top-4 text-xs text-gray-400 font-bold">
                            {nickname.length}/10
                        </span>
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs mb-4 font-bold flex items-center gap-1 bg-red-50 p-2 rounded-lg">
                            ⚠️ {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center
                            ${loading
                            ? 'bg-gray-400 cursor-wait'
                            : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-95'}
                        `}
                    >
                        {loading ? '저장 중...' : '설정 완료'}
                    </button>
                </form>
            </div>
        </div>
    );
}