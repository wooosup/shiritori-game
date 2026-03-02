import { describe, expect, it } from 'vitest';
import { isRetryableGetError } from './retryPolicy';

describe('isRetryableGetError', () => {
  it('does not retry non-GET requests', () => {
    expect(isRetryableGetError({ config: { method: 'post' } })).toBe(false);
  });

  it('retries timeout GET requests', () => {
    expect(isRetryableGetError({ config: { method: 'get' }, code: 'ECONNABORTED' })).toBe(true);
  });

  it('does not retry auth failures', () => {
    expect(isRetryableGetError({ config: { method: 'get' }, response: { status: 401 } })).toBe(false);
  });
});
