import { GoogleAuth } from '@southdevs/capacitor-google-auth';
import { supabase } from '../api/axios';
import { appEnv } from '../config/env';
import { getRuntimePlatform, isNativeApp } from './runtime';

const NATIVE_OAUTH_REDIRECT_URL = 'shiritori://auth/callback';

export const isNativeRuntime = () => isNativeApp();

export const getOAuthRedirectUrl = (): string => {
  return isNativeRuntime() ? NATIVE_OAUTH_REDIRECT_URL : window.location.origin;
};

const hasNativeGoogleConfig = (): boolean => {
  return appEnv.googleWebClientId.length > 0;
};

async function signInWithSupabaseOAuth(native: boolean): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getOAuthRedirectUrl(),
      skipBrowserRedirect: native,
    },
  });

  if (error) {
    throw error;
  }
}

const ensureNativeGoogleInitialized = (): void => {
  if (!isNativeRuntime() || !hasNativeGoogleConfig()) {
    return;
  }

  GoogleAuth.initialize({
    clientId: appEnv.googleWebClientId,
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
};

export async function signOutNativeGoogle(): Promise<void> {
  if (!isNativeRuntime() || !hasNativeGoogleConfig()) {
    return;
  }

  ensureNativeGoogleInitialized();

  try {
    await GoogleAuth.signOut();
  } catch {
    // noop
  }
}

export async function signInWithGoogle(): Promise<void> {
  const native = isNativeRuntime();
  const platform = getRuntimePlatform();

  if (native && !appEnv.googleWebClientId) {
    throw new Error(
      'Google OAuth 설정이 필요합니다. VITE_GOOGLE_WEB_CLIENT_ID를 설정하고 다시 시도해주세요.',
    );
  }

  if (native && platform === 'android' && !appEnv.googleAndroidClientId) {
    throw new Error(
      'Android Google OAuth 설정이 필요합니다. VITE_GOOGLE_ANDROID_CLIENT_ID를 설정하고 다시 시도해주세요.',
    );
  }

  if (native) {
    ensureNativeGoogleInitialized();

    try {
      const user = await GoogleAuth.signIn({
        scopes: ['profile', 'email'],
      });
      const idToken = user.authentication?.idToken;

      if (!idToken) {
        throw new Error('Google 로그인 idToken을 확인할 수 없어요.');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        throw error;
      }
      return;
    } catch (error) {
      const maybeError = error as { code?: string | number; message?: string };
      const code = String(maybeError?.code ?? '');
      const message = maybeError?.message ?? '';

      if (platform === 'android' && (code === '10' || message.includes('code":"10'))) {
        throw new Error(
          'Google 로그인 설정 오류(code 10)입니다. Google Cloud Console에 Android OAuth Client(패키지명 com.shiritori.game + SHA-1)를 등록하고 다시 시도해주세요.',
        );
      }

      throw error;
    }
  }

  await signInWithSupabaseOAuth(false);
}

export async function handleAuthCallbackUrl(url: string): Promise<boolean> {
  if (!url.startsWith('shiritori://auth/callback')) {
    return false;
  }

  const parsedUrl = new URL(url);
  const hashPart = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash;
  const queryPart = parsedUrl.search.startsWith('?') ? parsedUrl.search.slice(1) : parsedUrl.search;
  const hashParams = new URLSearchParams(hashPart);
  const queryParams = new URLSearchParams(queryPart);

  const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') ?? queryParams.get('refresh_token');

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return true;
  }

  const error = hashParams.get('error') || queryParams.get('error');
  if (error) {
    return true;
  }

  return false;
}
