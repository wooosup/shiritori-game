import { useSettingsStore } from '../stores/settingsStore';

type EffectName = 'button' | 'error';

const EFFECT_SOURCES: Record<EffectName, string[]> = {
  button: ['/poka01.m4a', '/poka01.mp3'],
  error: ['/blip03.m4a', '/blip03.mp3'],
};

const warnedEffects = new Set<EffectName>();
const PLAYER_POOL_SIZE = 3;
const audioPools = new Map<EffectName, HTMLAudioElement[]>();
const poolCursor = new Map<EffectName, number>();
let lastPlayAt = 0;
let primed = false;
let lastTriggeredButtonAt = 0;

function toAbsoluteUrl(path: string): string {
  if (typeof window === 'undefined') {
    return path;
  }
  return new URL(path, window.location.origin).toString();
}

function resolveEffectSource(name: EffectName): string {
  const candidates = EFFECT_SOURCES[name];
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
  (Object.keys(EFFECT_SOURCES) as EffectName[]).forEach((name) => {
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
  if (now - lastPlayAt < 18) {
    return;
  }
  lastPlayAt = now;

  const player = getNextPlayer(name);
  player.volume = volume;
  player.currentTime = 0;
  player.muted = false;
  void player.play().catch(() => {
    if (!warnedEffects.has(name)) {
      warnedEffects.add(name);
      console.warn(`[sfx] ${name} sound play failed`);
    }
  });
}

export function playButtonSfx(): void {
  playEffect('button', 1.0);
}

export function playErrorSfx(): void {
  playEffect('error', 1.0);
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

  document.addEventListener('pointerdown', triggerButtonSfx, true);
  document.addEventListener('touchstart', triggerButtonSfx, true);
  document.addEventListener('click', triggerButtonSfx, true);
  document.addEventListener('keydown', onKeyDown, true);
  return () => {
    document.removeEventListener('pointerdown', triggerButtonSfx, true);
    document.removeEventListener('touchstart', triggerButtonSfx, true);
    document.removeEventListener('click', triggerButtonSfx, true);
    document.removeEventListener('keydown', onKeyDown, true);
  };
}
