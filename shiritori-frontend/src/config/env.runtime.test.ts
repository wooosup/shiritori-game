import { describe, expect, it } from 'vitest';
import { resolveRuntimeEnv } from './env';

describe('resolveRuntimeEnv placeholder policy', () => {
  it('rejects placeholder env in native runtime', () => {
    expect(() =>
      resolveRuntimeEnv(
        {
          VITE_API_URL: 'http://localhost:8080/api',
          VITE_SUPABASE_URL: 'https://example.supabase.co',
          VITE_SUPABASE_ANON_KEY: 'public-anon-key',
        },
        'native',
      ),
    ).toThrowError('Invalid mobile env: placeholder values are not allowed');
  });

  it('allows placeholder fallback in web runtime', () => {
    const resolved = resolveRuntimeEnv(
      {
        VITE_API_URL: '',
        VITE_SUPABASE_URL: '',
        VITE_SUPABASE_ANON_KEY: '',
      },
      'web',
    );

    expect(resolved.apiBaseUrl).toBe('http://localhost:8080/api');
    expect(resolved.supabaseUrl).toBe('https://example.supabase.co');
  });
});
