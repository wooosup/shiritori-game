import { supabase } from '../api/axios';
import { useAuthStore } from '../stores/authStore';

export const APP_AUTH_CALLBACK_URL = 'shiritori://auth/callback';
export const WEB_AUTH_CALLBACK_PATH = '/auth/callback';

export const getWebAuthCallbackUrl = () => `${window.location.origin}${WEB_AUTH_CALLBACK_PATH}`;

const isNativePlatform = () => {
    const capacitor = (window as any).Capacitor;
    if (!capacitor) return false;
    if (typeof capacitor.isNativePlatform === 'function') return capacitor.isNativePlatform();
    if (typeof capacitor.getPlatform === 'function') return capacitor.getPlatform() !== 'web';
    return false;
};

export const getOAuthRedirectUrl = () =>
    isNativePlatform() ? APP_AUTH_CALLBACK_URL : getWebAuthCallbackUrl();

const getAuthErrorMessage = (errorCode?: string | null, errorDescription?: string | null) => {
    const normalized = `${errorCode ?? ''} ${errorDescription ?? ''}`.toLowerCase();

    if (normalized.includes('access_denied') || normalized.includes('cancel')) {
        return {
            type: 'warning' as const,
            text: '로그인이 취소되었어요. 다시 시도해 주세요.',
        };
    }

    if (normalized.includes('expired')) {
        return {
            type: 'warning' as const,
            text: '로그인 시간이 만료되었어요. 다시 로그인해 주세요.',
        };
    }

    return {
        type: 'error' as const,
        text: '로그인 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
    };
};

export const consumeAuthRedirect = async (rawUrl: string) => {
    const setAuthMessage = useAuthStore.getState().setAuthMessage;

    try {
        const parsedUrl = new URL(rawUrl);
        const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
        const queryParams = parsedUrl.searchParams;

        const errorCode = queryParams.get('error_code') ?? hashParams.get('error_code');
        const errorDescription = queryParams.get('error_description') ?? hashParams.get('error_description');

        if (errorCode || errorDescription) {
            setAuthMessage(getAuthErrorMessage(errorCode, errorDescription));
            return false;
        }

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (error) {
                setAuthMessage(getAuthErrorMessage(error.name, error.message));
                return false;
            }

            setAuthMessage({
                type: 'success',
                text: '로그인에 성공했어요. 게임을 시작해 보세요!',
            });
            return true;
        }

        const authCode = queryParams.get('code');
        if (authCode) {
            const { error } = await supabase.auth.exchangeCodeForSession(authCode);
            if (error) {
                setAuthMessage(getAuthErrorMessage(error.name, error.message));
                return false;
            }

            setAuthMessage({
                type: 'success',
                text: '로그인에 성공했어요. 게임을 시작해 보세요!',
            });
            return true;
        }

        return false;
    } catch {
        setAuthMessage({
            type: 'error',
            text: '로그인 결과를 확인하지 못했어요. 다시 시도해 주세요.',
        });
        return false;
    }
};
