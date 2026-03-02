import { create } from 'zustand';

const SFX_STORAGE_KEY = 'shiritori:sfx-enabled';
const THEME_STORAGE_KEY = 'shiritori:theme-preference';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

function getSafeLocalStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storage = window.localStorage as Partial<Storage> | undefined;
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') {
    return null;
  }
  return storage as Pick<Storage, 'getItem' | 'setItem'>;
}

function loadInitialSfxEnabled(): boolean {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return true;
  }

  const saved = storage.getItem(SFX_STORAGE_KEY);
  if (saved == null) {
    return true;
  }
  return saved === 'true';
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function loadInitialThemePreference(): ThemePreference {
  const storage = getSafeLocalStorage();
  if (!storage) {
    return 'system';
  }

  const saved = storage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return getSystemPrefersDark() ? 'dark' : 'light';
  }
  return preference;
}

interface SettingsState {
  sfxEnabled: boolean;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setSfxEnabled: (enabled: boolean) => void;
  toggleSfx: () => void;
  setThemePreference: (preference: ThemePreference) => void;
  cycleThemePreference: () => void;
  syncSystemTheme: (prefersDark: boolean) => void;
}

const initialThemePreference = loadInitialThemePreference();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  sfxEnabled: loadInitialSfxEnabled(),
  themePreference: initialThemePreference,
  resolvedTheme: resolveTheme(initialThemePreference),
  setSfxEnabled: (enabled) => {
    const storage = getSafeLocalStorage();
    if (storage) {
      storage.setItem(SFX_STORAGE_KEY, String(enabled));
    }
    set({ sfxEnabled: enabled });
  },
  toggleSfx: () => {
    const next = !get().sfxEnabled;
    const storage = getSafeLocalStorage();
    if (storage) {
      storage.setItem(SFX_STORAGE_KEY, String(next));
    }
    set({ sfxEnabled: next });
  },
  setThemePreference: (preference) => {
    const storage = getSafeLocalStorage();
    if (storage) {
      storage.setItem(THEME_STORAGE_KEY, preference);
    }
    set({
      themePreference: preference,
      resolvedTheme: resolveTheme(preference),
    });
  },
  cycleThemePreference: () => {
    const order: ThemePreference[] = ['system', 'light', 'dark'];
    const current = get().themePreference;
    const next = order[(order.indexOf(current) + 1) % order.length];
    const storage = getSafeLocalStorage();
    if (storage) {
      storage.setItem(THEME_STORAGE_KEY, next);
    }
    set({
      themePreference: next,
      resolvedTheme: resolveTheme(next),
    });
  },
  syncSystemTheme: (prefersDark) => {
    const state = get();
    if (state.themePreference !== 'system') {
      return;
    }
    const nextResolved: ResolvedTheme = prefersDark ? 'dark' : 'light';
    if (state.resolvedTheme !== nextResolved) {
      set({ resolvedTheme: nextResolved });
    }
  },
}));
