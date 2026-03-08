import { describe, expect, it, vi } from 'vitest';
import { clearAuthAndGameStorage } from './axios';

describe('clearAuthAndGameStorage', () => {
  it('removes auth/game keys but preserves settings keys', () => {
    const removeItem = vi.fn();

    clearAuthAndGameStorage({ removeItem });

    expect(removeItem).toHaveBeenCalledWith('supabase.auth.token');
    expect(removeItem).toHaveBeenCalledWith('sb-example-auth-token');
    expect(removeItem).toHaveBeenCalledWith('shiritori:active-game:v1');
    expect(removeItem).toHaveBeenCalledWith('shiritori:tutorial-seen:v1');
    expect(removeItem).not.toHaveBeenCalledWith('shiritori:sfx-enabled');
    expect(removeItem).not.toHaveBeenCalledWith('shiritori:theme-preference');
  });
});
