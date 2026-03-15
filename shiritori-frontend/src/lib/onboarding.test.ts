import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearOnboardingSeen, getOnboardingKey, hasSeenOnboarding, markOnboardingSeen } from './onboarding';

// These helpers wrap localStorage so the UI can gate first-run experiences.
describe('onboarding storage helpers', () => {
  const createMockStorage = () => {
    const store: Record<string, string> = {};

    return {
      getItem(key: string) {
        return store[key] ?? null;
      },
      setItem(key: string, value: string) {
        store[key] = value;
      },
      removeItem(key: string) {
        delete store[key];
      },
      clear() {
        Object.keys(store).forEach((key) => delete store[key]);
      },
    };
  };

  beforeEach(() => {
    const mockStorage = createMockStorage();
    vi.stubGlobal('localStorage', mockStorage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false by default', () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it('marks onboarding as seen and reads true', () => {
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it('clear reverts to false', () => {
    markOnboardingSeen();
    clearOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(false);
  });

  it('exposes stable key name', () => {
    expect(getOnboardingKey()).toMatch(/onboarding/);
  });
});
