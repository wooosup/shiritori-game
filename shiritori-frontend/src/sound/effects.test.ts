import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('sound effects', () => {
  const playMock = vi.fn().mockResolvedValue(undefined);
  const loadMock = vi.fn();

  class AudioMock {
    preload = 'auto';
    volume = 1;
    currentTime = 0;
    muted = false;
    playbackRate = 1;
    src: string;

    constructor(src: string) {
      this.src = src;
    }

    load = loadMock;
    play = () => playMock();
  }

  beforeEach(() => {
    vi.resetModules();
    playMock.mockClear();
    loadMock.mockClear();
    vi.stubGlobal('Audio', AudioMock as unknown as typeof Audio);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not play result feedback when effects are disabled', async () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      value: vibrateMock,
    });

    const { useSettingsStore } = await import('../stores/settingsStore');
    useSettingsStore.setState({ sfxEnabled: false });

    const { playGameResultSfx } = await import('./effects');
    playGameResultSfx('win');

    expect(playMock).not.toHaveBeenCalled();
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('plays audio and haptic feedback for game results when enabled', async () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      value: vibrateMock,
    });

    const { useSettingsStore } = await import('../stores/settingsStore');
    useSettingsStore.setState({ sfxEnabled: true });

    const { playGameResultSfx } = await import('./effects');
    playGameResultSfx('win');

    expect(playMock).toHaveBeenCalledTimes(1);
    expect(vibrateMock).toHaveBeenCalledTimes(1);
  });
});
