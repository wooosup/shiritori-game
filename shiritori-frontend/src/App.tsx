import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { supabase } from './api/axios';
import { useAuthStore } from './stores/authStore';
import Home from './pages/Home';
import LoginModal from './components/LoginModal';
import GamePage from './pages/GamePage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { consumeAuthRedirect, WEB_AUTH_CALLBACK_PATH } from './config/authRedirect';

const RouteTracker = () => {
    const location = useLocation();

    useEffect(() => {
        ReactGA.send({ hitType: 'pageview', page: location.pathname + location.search });
    }, [location]);

    return null;
};

function App() {
    const { setSession, closeLoginModal } = useAuthStore();

    useEffect(() => {
        ReactGA.initialize('G-E9JYF0HN3G');

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                closeLoginModal();
            }
        });

        const capacitorApp = (window as any).Capacitor?.Plugins?.App;
        let removeNativeListener: (() => void) | undefined;

        const isNativePlatform =
            typeof (window as any).Capacitor?.isNativePlatform === 'function'
                ? (window as any).Capacitor.isNativePlatform()
                : typeof (window as any).Capacitor?.getPlatform === 'function'
                    ? (window as any).Capacitor.getPlatform() !== 'web'
                    : false;

        if (isNativePlatform && capacitorApp?.addListener) {
            capacitorApp
                .addListener('appUrlOpen', async ({ url }: { url: string }) => {
                    if (url.startsWith('shiritori://auth/callback')) {
                        await consumeAuthRedirect(url);
                        window.history.replaceState({}, '', '/');
                    }
                })
                .then((listener: { remove: () => void }) => {
                    removeNativeListener = () => listener.remove();
                });
        }

        return () => {
            subscription.unsubscribe();
            if (removeNativeListener) {
                removeNativeListener();
            }
        };
    }, [setSession, closeLoginModal]);

    return (
        <BrowserRouter>
            <RouteTracker />

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/game" element={<GamePage />} />
                <Route path={WEB_AUTH_CALLBACK_PATH} element={<AuthCallbackPage />} />
            </Routes>

            <LoginModal />
        </BrowserRouter>
    );
}

export default App;
