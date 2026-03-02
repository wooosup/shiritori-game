import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export type RuntimePlatform = 'web' | 'android';

export const getRuntimePlatform = (): RuntimePlatform => {
  try {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      return 'android';
    }
    return 'web';
  } catch {
    return 'web';
  }
};
