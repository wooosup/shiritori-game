import { useSettingsStore } from '../stores/settingsStore';

type EffectName = 'button' | 'error' | 'success' | 'combo' | 'win' | 'lose';
type HapticPattern = number | number[];

interface EffectConfig {
  sources: string[];
  volume: number;
  playbackRate: number;
  cooldownMs: number;
  haptic?: HapticPattern;
}

const BUTTON_EFFECT_SOURCES = ['/poka01.m4a', '/poka01.mp3'];
const ERROR_EFFECT_SOURCES = ['/blip03.m4a', '/blip03.mp3'];

const EFFECT_CONFIGS: Record<EffectName, EffectConfig> = {
  button: {
    sources: BUTTON_EFFECT_SOURCES,
    volume: 1.0,
    playbackRate: 1.0,
    cooldownMs: 90,
  },
  error: {
    sources: ERROR_EFFECT_SOURCES,
    volume: 1.0,
    playbackRate: 1.0,
    cooldownMs: 140,
    haptic: [24, 18, 32],
  },
  success: {
    sources: BUTTON_EFFECT_SOURCES,
    volume: 0.9,
    playbackRate: 1.08,
    cooldownMs: 120,
    haptic: 18,
  },
  combo: {
    sources: BUTTON_EFFECT_SOURCES,
    volume: 1.0,
    playbackRate: 1.24,
    cooldownMs: 220,
    haptic: [18, 14, 18],
  },
  win: {
    sources: BUTTON_EFFECT_SOURCES,
    volume: 1.0,
    playbackRate: 1.3,
    cooldownMs: 300,
    haptic: [20, 18, 42],
  },
  lose: {
    sources: ERROR_EFFECT_SOURCES,
    volume: 0.92,
    playbackRate: 0.9,
    cooldownMs: 300,
    haptic: [28, 22, 36],
  },
};

const warnedEffects = new Set<EffectName>();
const PLAYER_POOL_SIZE = 3;
const audioPools = new Map<EffectName, HTMLAudioElement[]>();
const poolCursor = new Map<EffectName, number>();
const lastPlayedByEffect = new Map<EffectName, number>();
let lastPlayAt = 0;
let primed = false;
let lastTriggeredButtonAt = 0;
let lastHapticAt = 0;

function toAbsoluteUrl(path: string): string {
  if (typeof window === 'undefined') {
    return path;
  }
  return new URL(path, window.location.origin).toString();
}

function resolveEffectSource(name: EffectName): string {
  const candidates = EFFECT_CONFIGS[name].sources;
  if (typeof document === 'undefined') {
    return candidates[0];
  }

  const probe = document.createElement('audio');
  const m4aPlayable = !!probe.canPlayType('audio/mp4; codecs="mp4a.40.2"');
  const mp3Playable = !!probe.canPlayType('audio/mpeg');

  if (m4aPlayable) {
    const m4a = candidates.find((path) => path.endsWith('.m4a'));
    if (m4a) {
      return m4a;
    }
  }

  if (mp3Playable) {
    const mp3 = candidates.find((path) => path.endsWith('.mp3'));
    if (mp3) {
      return mp3;
    }
  }

  return candidates[0];
}

function ensureAudioPool(name: EffectName): HTMLAudioElement[] {
  const existing = audioPools.get(name);
  if (existing) {
    return existing;
  }

  const src = toAbsoluteUrl(resolveEffectSource(name));
  const pool = Array.from({ length: PLAYER_POOL_SIZE }, () => {
    const player = new Audio(src);
    player.preload = 'auto';
    player.load();
    return player;
  });
  audioPools.set(name, pool);
  poolCursor.set(name, 0);
  return pool;
}

function primeAudioPools(): void {
  if (primed) {
    return;
  }
  primed = true;
  (Object.keys(EFFECT_CONFIGS) as EffectName[]).forEach((name) => {
    ensureAudioPool(name);
  });
}

function getNextPlayer(name: EffectName): HTMLAudioElement {
  const pool = ensureAudioPool(name);
  const cursor = poolCursor.get(name) ?? 0;
  const player = pool[cursor];
  poolCursor.set(name, (cursor + 1) % pool.length);
  return player;
}

function playEffect(name: EffectName, volume: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (!useSettingsStore.getState().sfxEnabled) {
    return;
  }

  const now = Date.now();
  const config = EFFECT_CONFIGS[name];
  const lastEffectAt = lastPlayedByEffect.get(name) ?? 0;
  if (now - lastEffectAt < config.cooldownMs) {
    return;
  }

  if (now - lastPlayAt < 18) {
    return;
  }
  lastPlayAt = now;
  lastPlayedByEffect.set(name, now);

  const player = getNextPlayer(name);
  player.volume = volume;
  player.currentTime = 0;
  player.playbackRate = config.playbackRate;
  player.muted = false;
  if (config.haptic && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    if (now - lastHapticAt >= 40) {
      lastHapticAt = now;
      navigator.vibrate(config.haptic);
    }
  }
  const playResult = player.play();
  if (playResult && typeof playResult.catch === 'function') {
    void playResult.catch(() => {
      if (!warnedEffects.has(name)) {
        warnedEffects.add(name);
        console.warn(`[sfx] ${name} sound play failed`);
      }
    });
  }
}

export function playButtonSfx(): void {
  playEffect('button', 1.0);
}

export function playErrorSfx(): void {
  playEffect('error', 1.0);
}

export function playSuccessSfx(): void {
  playEffect('success', EFFECT_CONFIGS.success.volume);
}

export function playComboSfx(): void {
  playEffect('combo', EFFECT_CONFIGS.combo.volume);
}

export function playGameResultSfx(result: 'win' | 'lose'): void {
  playEffect(result, EFFECT_CONFIGS[result].volume);
}

export function installGlobalButtonClickSfx(): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const getTargetButton = (event: Event): HTMLButtonElement | null => {
    const target = event.target as Element | null;
    if (!target) {
      return null;
    }

    const button = target.closest('button');
    if (!button) {
      return null;
    }

    const htmlButton = button as HTMLButtonElement;
    if (htmlButton.disabled || button.getAttribute('data-sfx') === 'off') {
      return null;
    }

    return htmlButton;
  };

  const triggerButtonSfx = (event: Event) => {
    const button = getTargetButton(event);
    if (!button) {
      return;
    }
    const now = Date.now();
    if (now - lastTriggeredButtonAt < 90) {
      return;
    }
    lastTriggeredButtonAt = now;

    if (!primed) {
      primeAudioPools();
    }
    playButtonSfx();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    triggerButtonSfx(event);
  };

  // 단일 포인터 이벤트만 사용해서 모바일/웹뷰에서 중복 재생을 방지한다.
  if ('PointerEvent' in window) {
    document.addEventListener('pointerdown', triggerButtonSfx, true);
  } else {
    document.addEventListener('click', triggerButtonSfx, true);
  }
  document.addEventListener('keydown', onKeyDown, true);
  return () => {
    if ('PointerEvent' in window) {
      document.removeEventListener('pointerdown', triggerButtonSfx, true);
    } else {
      document.removeEventListener('click', triggerButtonSfx, true);
    }
    document.removeEventListener('keydown', onKeyDown, true);
  };
}
