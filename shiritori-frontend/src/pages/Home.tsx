import {useState, useEffect, useRef} from 'react'; // useRef 추가
import {useNavigate} from 'react-router-dom';
import {supabase, apiClient} from '../api/axios';
import NicknameModal from '../components/NicknameModal';
import RuleModal from "../components/RuleModal.tsx";
import SearchModal from '../components/SearchModal';
import WordBookModal from "../components/WordBookModal.tsx";
import QuizModal from "../components/QuizModal.tsx";

interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

interface Ranking {
    nickname: string;
    maxCombo: number;
    score: number;
    level: string;
    endedAt: string;
}

export default function Home() {
    const navigate = useNavigate();

    // 상태 관리
    const [user, setUser] = useState<any>(null);
    const [nickname, setNickname] = useState<string | null>(null);
    const [level, setLevel] = useState('N5');
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [showNicknameModal, setShowNicknameModal] = useState(false);
    const [showRuleModal, setShowRuleModal] = useState(false);
    const [totalWords, setTotalWords] = useState<number>(0);
    const [bannerWords, setBannerWords] = useState<any[]>([]);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showWordBook, setShowWordBook] = useState(false);
    const [showQuizModal, setShowQuizModal] = useState(false);

    // 로딩 상태
    const [loading, setLoading] = useState(true);

    // 🚨 마운트 여부 체크용 Ref (비동기 상태 업데이트 방지)
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        const init = async () => {
            const timer = setTimeout(() => {
                if (isMounted.current) setLoading(false);
            }, 1000);

            try {
                const [countRes, randomRes] = await Promise.allSettled([
                    apiClient.get('/words/count'),
                    apiClient.get('/words/random')
                ]);

                if (countRes.status === 'fulfilled') setTotalWords(countRes.value.data.data);
                if (randomRes.status === 'fulfilled') setBannerWords(randomRes.value.data.data);

                // 병렬 처리로 속도 향상
                const [sessionRes, rankRes] = await Promise.allSettled([
                    supabase.auth.getSession(),
                    apiClient.get<ApiResponse<Ranking[]>>('/ranks')
                ]);

                // 1. 세션 처리
                if (sessionRes.status === 'fulfilled' && sessionRes.value.data.session) {
                    const session = sessionRes.value.data.session;
                    if (isMounted.current) setUser(session.user);

                    // 프로필 가져오기
                    try {
                        const profileRes = await apiClient.get('/profiles/me');
                        if (isMounted.current && profileRes.data.code === 200) {
                            setNickname(profileRes.data.data.nickname);
                        }
                    } catch (err: any) {
                        // 401 에러면 로그아웃 필요 (단, 여기선 바로 리다이렉트만)
                        if (err.response?.status === 401) {
                            handleLogout();
                            return;
                        }
                    }
                }

                // 2. 랭킹 처리
                if (rankRes.status === 'fulfilled' && rankRes.value.data.code === 200) {
                    if (isMounted.current) setRankings(rankRes.value.data.data);
                }

            } catch (error) {
                console.error("초기화 에러:", error);
            } finally {
                clearTimeout(timer);
                if (isMounted.current) setLoading(false);
            }
        };

        init();

        // Auth 상태 감지 리스너
        const {data: authListener} = supabase.auth.onAuthStateChange((event, session) => {
            if (!isMounted.current) return;

            if (event === 'SIGNED_IN' && session) {
                setUser(session.user);
                apiClient.get('/profiles/me')
                    .then(res => {
                        if (isMounted.current && res.data.code === 200) {
                            const myNick = res.data.data.nickname;
                            setNickname(myNick);
                            if (!myNick) setShowNicknameModal(true);
                        }
                    })
                    .catch(() => {
                    });
            }
        });

        return () => {
            isMounted.current = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    // 구글 로그인
    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {redirectTo: window.location.origin},
        });
    };

    // React 상태 업데이트 없이 브라우저 강제 리셋
    const handleLogout = () => {
        supabase.auth.signOut().catch(() => {
        });
        localStorage.clear();
        window.location.replace('/');
    };

    const handleStart = () => {
        if (!user) {
            handleLogin();
            return;
        }
        if (!nickname) {
            setShowNicknameModal(true);
            return;
        }
        navigate('/game', {state: {level}});
    };

    if (loading) return <div className="flex h-screen items-center justify-center">로딩 중...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center relative pb-12">

            <WordBookModal isOpen={showWordBook} onClose={() => setShowWordBook(false)}/>
            <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)}/>
            <QuizModal isOpen={showQuizModal} onClose={() => setShowQuizModal(false)}/>

            {user && (
                <NicknameModal
                    isOpen={showNicknameModal}

                    canClose={!!nickname}

                    onClose={() => {
                        if (nickname) setShowNicknameModal(false);
                    }}

                    onSuccess={(newNick) => {
                        setNickname(newNick);
                        setShowNicknameModal(false);
                        apiClient.get<ApiResponse<Ranking[]>>('/ranks')
                            .then(res => setRankings(res.data.data))
                            .catch(console.error);
                    }}
                />
            )}

            <RuleModal
                isOpen={showRuleModal}
                onClose={() => setShowRuleModal(false)}
            />

            <header className="w-full flex justify-end p-4 bg-white shadow-sm absolute top-0 z-10">
                {user ? (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowQuizModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition shadow-sm"
                        >
                            <span>📝</span>
                            <span className="hidden sm:inline">퀴즈</span>
                        </button>

                        <button
                            onClick={() => setShowWordBook(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition shadow-sm"
                        >
                            <span>📒</span>
                            <span className="hidden sm:inline">단어장</span>
                        </button>


                        <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>

                        <button
                            onClick={() => setShowNicknameModal(true)}
                            className="text-gray-700 font-bold hover:text-indigo-600 hover:underline decoration-2 underline-offset-4 transition cursor-pointer"
                            title="닉네임 변경"
                        >
                            {nickname ? `${nickname}님` : '닉네임 설정 중...'}
                        </button>

                        <button onClick={handleLogout}
                                className="px-4 py-2 text-sm text-red-500 border border-red-500 rounded-lg hover:bg-red-50 transition">
                            로그아웃
                        </button>
                    </div>
                ) : (
                    <button onClick={handleLogin}
                            className="px-6 py-2 font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5"
                             alt="google"/>
                        로그인
                    </button>
                )}
            </header>

            <main className="flex flex-col items-center mt-32 w-full max-w-4xl px-4 animate-fadeIn">
                <h1 className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 mb-10 tracking-tighter">
                    しりとり
                </h1>

                <div className="flex items-center gap-3 mb-8">
                    <div
                        className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-600 border border-gray-100">
                        📚 등록된 단어: <span className="text-indigo-600">{totalWords.toLocaleString()}</span>개
                    </div>
                    <button
                        onClick={() => setShowSearchModal(true)}
                        className="bg-white p-2 rounded-full shadow-sm text-gray-500 hover:text-indigo-600 border border-gray-100 transition"
                        title="단어 검색"
                    >
                        🔍
                    </button>
                </div>

                {/* 👇 게임 컨트롤 박스 */}
                <div
                    className="flex flex-col items-center p-8 space-y-6 bg-white rounded-3xl shadow-xl w-full max-w-md border border-gray-100">

                    <div className="w-full">
                        {/* ✅ 라벨과 버튼을 한 줄에 배치 (Flexbox) */}
                        <div className="flex justify-between items-center mb-2">
                            <label className="font-bold text-gray-700">난이도 선택</label>

                            <button
                                onClick={() => setShowRuleModal(true)}
                                className="text-xs sm:text-sm font-medium text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2}
                                     stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/>
                                </svg>
                                게임 규칙
                            </button>
                        </div>

                        {/* 셀렉트 박스 */}
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value)}
                            className="w-full p-4 border bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-lg"
                        >
                            <option value="N5">N5</option>
                            <option value="N4">N4</option>
                            <option value="N3">N3</option>
                            <option value="N2">N2</option>
                            <option value="N1">N1</option>
                        </select>
                    </div>

                    <button
                        onClick={handleStart}
                        className="w-full py-5 text-2xl font-black text-white transition-all transform bg-indigo-600 rounded-xl hover:bg-indigo-700 hover:shadow-lg active:scale-95"
                    >
                        게임 시작 🎮
                    </button>
                </div>

                <div className="w-full max-w-3xl mt-12 mb-10">
                    <div className="overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-sm">
                        <table className="w-full text-left table-fixed border-collapse">
                            <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 text-xs font-bold text-gray-500 w-10 text-center">#</th>
                                <th className="p-3 text-xs font-bold text-gray-500">닉네임</th>
                                <th className="hidden sm:table-cell p-3 text-xs font-bold text-gray-500 w-16 text-center">레벨</th>
                                <th className="p-3 text-xs font-bold text-gray-500 w-16 text-center">콤보</th>
                                <th className="p-3 text-xs font-bold text-gray-500 w-24 text-right">점수</th>
                            </tr>
                            </thead>
                            <tbody className="text-sm">
                            {rankings.length > 0 ? (
                                rankings.map((rank, index) => (
                                    <tr key={index}
                                        className="border-b last:border-0 hover:bg-indigo-50/50 transition-colors">
                                        <td className="p-3 text-center font-bold text-gray-400">
                                            {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                                        </td>
                                        <td className="p-3 font-bold text-gray-800 truncate">{rank.nickname}</td>
                                        <td className="hidden sm:table-cell p-3 text-center">
                                                <span
                                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">{rank.level}</span>
                                        </td>
                                        <td className="p-3 text-center text-gray-600">{rank.maxCombo}</td>
                                        <td className="p-3 text-right font-black text-indigo-600">{rank.score.toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-gray-400 font-medium">
                                        {loading ? '데이터 불러오는 중...' : '아직 데이터가 없습니다.'}
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
            <div
                className="fixed bottom-0 w-full bg-indigo-900 text-white h-10 flex items-center overflow-hidden z-20 shadow-lg">
                <div className="w-full overflow-hidden">
                    <div className="animate-ticker pl-[100%]">
                        {bannerWords.map((word, idx) => (
                            <span key={idx} className="mx-8 font-medium text-sm text-indigo-100">
                                {word.word} ({word.reading}) - {word.meaning}
                            </span>
                        ))}
                        {/* 로딩 중일 때 표시할 문구 */}
                        {bannerWords.length === 0 && "일본어 끝말잇기 게임에 오신 것을 환영합니다! 🎉"}
                    </div>
                </div>
            </div>
        </div>
    );
}