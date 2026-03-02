import { describe, expect, it, vi } from 'vitest';
import { handleAuthCallbackUrl } from './auth';
import { supabase } from '../api/axios';

vi.mock('../api/axios', () => ({
  supabase: {
    auth: {
      setSession: vi.fn(),
    },
  },
}));

describe('handleAuthCallbackUrl', () => {
  it('consumes query-style callback tokens', async () => {
    const consumed = await handleAuthCallbackUrl(
      'shiritori://auth/callback?access_token=a&refresh_token=b',
    );

    expect(consumed).toBe(true);
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'a',
      refresh_token: 'b',
    });
  });

  it('consumes callback error response', async () => {
    const consumed = await handleAuthCallbackUrl('shiritori://auth/callback#error=access_denied');
    expect(consumed).toBe(true);
  });
});
