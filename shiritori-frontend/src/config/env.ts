import { isNativeApp } from '../platform/runtime';

export interface EnvSource {
  VITE_API_URL?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_GOOGLE_WEB_CLIENT_ID?: string;
  VITE_GOOGLE_ANDROID_CLIENT_ID?: string;
}

export interface AppEnv {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleWebClientId: string;
  googleAndroidClientId: string;
}

export type AppRuntime = 'web' | 'native';

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api';
const DEFAULT_SUPABASE_URL = 'https://example.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'public-anon-key';

const MOBILE_PLACEHOLDER_PATTERNS: Array<[keyof AppEnv, RegExp]> = [
  ['apiBaseUrl', /^https?:\/\/localhost(:\d+)?\/?/i],
  ['supabaseUrl', /example\.supabase\.co/i],
  ['supabaseAnonKey', /^public-anon-key$/i],
];

function getRuntime(): AppRuntime {
  return isNativeApp() ? 'native' : 'web';
}

function ensureMobileValue(key: string, value: string): string {
  if (!value) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}

export function resolveRuntimeEnv(source: EnvSource, runtime: AppRuntime): AppEnv {
  const apiBaseUrl =
    source.VITE_API_URL?.trim() || (runtime === 'web' ? DEFAULT_API_BASE_URL : '');
  const supabaseUrl =
    source.VITE_SUPABASE_URL?.trim() || (runtime === 'web' ? DEFAULT_SUPABASE_URL : '');
  const supabaseAnonKey =
    source.VITE_SUPABASE_ANON_KEY?.trim() || (runtime === 'web' ? DEFAULT_SUPABASE_ANON_KEY : '');
  const googleWebClientId = source.VITE_GOOGLE_WEB_CLIENT_ID?.trim() || '';
  const googleAndroidClientId = source.VITE_GOOGLE_ANDROID_CLIENT_ID?.trim() || '';

  const resolved: AppEnv = {
    apiBaseUrl:
      runtime === 'native'
        ? ensureMobileValue('VITE_API_URL', apiBaseUrl).replace(/\/$/, '')
        : apiBaseUrl.replace(/\/$/, ''),
    supabaseUrl:
      runtime === 'native' ? ensureMobileValue('VITE_SUPABASE_URL', supabaseUrl) : supabaseUrl,
    supabaseAnonKey:
      runtime === 'native'
        ? ensureMobileValue('VITE_SUPABASE_ANON_KEY', supabaseAnonKey)
        : supabaseAnonKey,
    googleWebClientId,
    googleAndroidClientId,
  };

  if (runtime === 'native') {
    for (const [key, pattern] of MOBILE_PLACEHOLDER_PATTERNS) {
      if (pattern.test(resolved[key])) {
        throw new Error('Invalid mobile env: placeholder values are not allowed');
      }
    }
  }

  return resolved;
}

export function loadAppEnv(source: EnvSource): AppEnv {
  return resolveRuntimeEnv(source, getRuntime());
}

export const appEnv = loadAppEnv(
  {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_GOOGLE_WEB_CLIENT_ID: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
    VITE_GOOGLE_ANDROID_CLIENT_ID: import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID,
  },
);
