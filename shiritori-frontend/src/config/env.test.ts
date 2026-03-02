import { describe, expect, it } from 'vitest';
import { resolveRuntimeEnv } from './env';

describe('resolveRuntimeEnv', () => {
  it('throws when VITE_API_URL is missing on native runtime', () => {
    expect(() =>
      resolveRuntimeEnv(
        {
          VITE_API_URL: '',
          VITE_SUPABASE_URL: 'https://project.supabase.co',
          VITE_SUPABASE_ANON_KEY: 'anon-key',
        },
        'native',
      ),
    ).toThrowError('Missing required env: VITE_API_URL');
  });

  it('normalizes trailing slash on web runtime', () => {
    const env = resolveRuntimeEnv(
      {
        VITE_API_URL: 'https://api.example.com/api/',
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'anon-key',
      },
      'web',
    );

    expect(env.apiBaseUrl).toBe('https://api.example.com/api');
  });
});
