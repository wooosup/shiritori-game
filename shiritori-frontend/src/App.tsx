import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './api/axios';
import { useAuthStore } from './stores/authStore';
import Home from './pages/Home';
import LoginModal from './components/LoginModal';
import GamePage from './pages/GamePage';

function App() {
    const { setSession, closeLoginModal } = useAuthStore();

    useEffect(() => {
        // 1. 초기 세션 확인
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        // 2. 인증 상태 변경 감지 (로그인/로그아웃 시 자동 실행)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                closeLoginModal(); // 로그인 성공하면 팝업 닫기
            }
        });

        return () => subscription.unsubscribe();
    }, [setSession, closeLoginModal]);

    return (
        <BrowserRouter>
            {/* 라우트 설정 */}
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/game" element={<GamePage />} />
            </Routes>

            {/* 로그인 팝업 (어디서든 뜰 수 있게 최상위에 배치) */}
            <LoginModal />
        </BrowserRouter>
    );
}

export default App;