import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from './api/axios';
import { useAuthStore } from './stores/authStore';
import { useSettingsStore } from './stores/settingsStore';
import Home from './pages/Home';
import LegalDocumentPage from './pages/LegalDocumentPage';
import { handleAuthCallbackUrl, isNativeRuntime } from './platform/auth';
import { installGlobalButtonClickSfx } from './sound/effects';

const GamePage = lazy(() => import('./pages/GamePage'));
const WordBookPage = lazy(() => import('./pages/WordBookPage'));
const RankingPage = lazy(() => import('./pages/RankingPage'));

function App() {
  const { setSession } = useAuthStore();
  const themePreference = useSettingsStore((state) => state.themePreference);
  const resolvedTheme = useSettingsStore((state) => state.resolvedTheme);
  const syncSystemTheme = useSettingsStore((state) => state.syncSystemTheme);

  useEffect(() => {
    let disposeAppUrlListener: (() => void) | null = null;
    const disposeButtonSfx = installGlobalButtonClickSfx();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    if (isNativeRuntime()) {
      CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        const consumed = await handleAuthCallbackUrl(url);
        if (consumed) {
          try {
            await Browser.close();
          } catch {
            // noop
          }
          globalThis.location.hash = '#/';
        }
      })
        .then((listener) => {
          disposeAppUrlListener = () => {
            void listener.remove();
          };
        })
        .catch(() => {
          // noop
        });
    }

    return () => {
      subscription.unsubscribe();
      disposeAppUrlListener?.();
      disposeButtonSfx();
    };
  }, [setSession]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    syncSystemTheme(media.matches);

    const onMediaChange = (event: MediaQueryListEvent) => {
      syncSystemTheme(event.matches);
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onMediaChange);
      return () => {
        media.removeEventListener('change', onMediaChange);
      };
    }

    media.addListener(onMediaChange);
    return () => {
      media.removeListener(onMediaChange);
    };
  }, [themePreference, syncSystemTheme]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const isDark = resolvedTheme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [resolvedTheme]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/legal/privacy"
          element={<LegalDocumentPage title="개인정보처리방침" type="privacy" />}
        />
        <Route
          path="/legal/account-deletion"
          element={<LegalDocumentPage title="계정 삭제 안내" type="account-deletion" />}
        />
        <Route
          path="/game"
          element={(
            <Suspense fallback={null}>
              <GamePage />
            </Suspense>
          )}
        />
        <Route
          path="/wordbook"
          element={(
            <Suspense fallback={null}>
              <WordBookPage />
            </Suspense>
          )}
        />
        <Route
          path="/ranking"
          element={(
            <Suspense fallback={null}>
              <RankingPage />
            </Suspense>
          )}
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
