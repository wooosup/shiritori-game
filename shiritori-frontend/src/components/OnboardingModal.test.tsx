import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearOnboardingSeen, hasSeenOnboarding } from '../lib/onboarding';
import OnboardingModal from './OnboardingModal';

describe('OnboardingModal', () => {
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
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: mockStorage,
    });
    clearOnboardingSeen();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearOnboardingSeen();
  });

  it('advances through onboarding steps and completes with the provided CTA', () => {
    const onCta = vi.fn();
    const onClose = vi.fn();

    render(
      <OnboardingModal
        isOpen
        ctaLabel="게임 시작하기"
        onCta={onCta}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('끝말잇기 규칙')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('점수와 콤보')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('PASS와 포기')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('단어장과 퀴즈')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '게임 시작하기' }));

    expect(onCta).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(hasSeenOnboarding()).toBe(true);
  });

  it('marks onboarding as seen when skipped', () => {
    const onCta = vi.fn();
    const onClose = vi.fn();

    render(
      <OnboardingModal
        isOpen
        ctaLabel="Google로 시작하기"
        onCta={onCta}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }));

    expect(onCta).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(hasSeenOnboarding()).toBe(true);
  });
});
