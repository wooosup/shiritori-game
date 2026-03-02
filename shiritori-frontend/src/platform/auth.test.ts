import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getOAuthRedirectUrl, handleAuthCallbackUrl, signInWithGoogle } from './auth';
import { supabase } from '../api/axios';
import { getRuntimePlatform, isNativeApp } from './runtime';
import { GoogleAuth } from '@southdevs/capacitor-google-auth';
import { appEnv } from '../config/env';

vi.mock('./runtime', () => ({
  isNativeApp: vi.fn(),
  getRuntimePlatform: vi.fn(() => 'web'),
}));

vi.mock('../config/env', () => ({
  appEnv: {
    apiBaseUrl: 'https://api.example.com/api',
    supabaseUrl: 'https://project.supabase.co',
    supabaseAnonKey: 'anon-key',
    googleWebClientId: '',
    googleAndroidClientId: '',
  },
}));

vi.mock('../api/axios', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signInWithIdToken: vi.fn().mockResolvedValue({ error: null }),
      setSession: vi.fn(),
    },
  },
}));

vi.mock('@southdevs/capacitor-google-auth', () => ({
  GoogleAuth: {
    initialize: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  },
}));

describe('auth platform helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isNativeApp).mockReturnValue(false);
    vi.mocked(getRuntimePlatform).mockReturnValue('web');
    appEnv.googleWebClientId = '';
    appEnv.googleAndroidClientId = '';
  });

  it('uses deep-link redirect on native runtime', () => {
    vi.mocked(isNativeApp).mockReturnValue(true);
    expect(getOAuthRedirectUrl()).toBe('shiritori://auth/callback');
  });

  it('signs in with native google id token on native runtime', async () => {
    vi.mocked(isNativeApp).mockReturnValue(true);
    vi.mocked(getRuntimePlatform).mockReturnValue('android');
    appEnv.googleWebClientId = 'google-web-client-id.apps.googleusercontent.com';
    appEnv.googleAndroidClientId = 'google-android-client-id.apps.googleusercontent.com';
    vi.mocked(GoogleAuth.signIn).mockResolvedValue({
      authentication: { idToken: 'native-google-id-token' },
    } as never);

    await signInWithGoogle();

    expect(GoogleAuth.initialize).toHaveBeenCalledWith({
      clientId: 'google-web-client-id.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
    expect(GoogleAuth.signIn).toHaveBeenCalled();
    expect(supabase.auth.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'native-google-id-token',
    });
    expect(GoogleAuth.signIn).toHaveBeenCalledWith({
      scopes: ['profile', 'email'],
    });
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it('uses browser oauth on web runtime', async () => {
    vi.mocked(isNativeApp).mockReturnValue(false);
    vi.mocked(getRuntimePlatform).mockReturnValue('web');
    appEnv.googleWebClientId = '';
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({ data: {}, error: null } as never);

    await signInWithGoogle();

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalled();
  });

  it('throws clear error when android native sign-in returns code 10', async () => {
    vi.mocked(isNativeApp).mockReturnValue(true);
    vi.mocked(getRuntimePlatform).mockReturnValue('android');
    appEnv.googleWebClientId = 'google-web-client-id.apps.googleusercontent.com';
    appEnv.googleAndroidClientId = 'google-android-client-id.apps.googleusercontent.com';
    vi.mocked(GoogleAuth.signIn).mockRejectedValue({
      code: '10',
      message: 'Something went wrong',
    } as never);
    await expect(signInWithGoogle()).rejects.toThrowError(
      'Google 로그인 설정 오류(code 10)입니다. Google Cloud Console에 Android OAuth Client(패키지명 com.shiritori.game + SHA-1)를 등록하고 다시 시도해주세요.',
    );
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
    expect(supabase.auth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it('throws clear error when android native client id is missing', async () => {
    vi.mocked(isNativeApp).mockReturnValue(true);
    vi.mocked(getRuntimePlatform).mockReturnValue('android');
    appEnv.googleWebClientId = 'google-web-client-id.apps.googleusercontent.com';

    await expect(signInWithGoogle()).rejects.toThrowError(
      'Android Google OAuth 설정이 필요합니다. VITE_GOOGLE_ANDROID_CLIENT_ID를 설정하고 다시 시도해주세요.',
    );
    expect(GoogleAuth.signIn).not.toHaveBeenCalled();
  });

  it('consumes callback URL and stores session', async () => {
    const consumed = await handleAuthCallbackUrl(
      'shiritori://auth/callback#access_token=token&refresh_token=refresh',
    );

    expect(consumed).toBe(true);
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'token',
      refresh_token: 'refresh',
    });
  });
});
