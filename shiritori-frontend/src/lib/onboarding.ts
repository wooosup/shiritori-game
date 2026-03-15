const STORAGE_KEY = 'shiritori:onboarding-seen:v1';

export function markOnboardingSeen(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, 'true');
  } catch (error) {
    console.error('onboarding mark failed', error);
  }
}

export function clearOnboardingSeen(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('onboarding clear failed', error);
  }
}

export function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (error) {
    console.error('onboarding read failed', error);
    return false;
  }
}

export function getOnboardingKey(): string {
  return STORAGE_KEY;
}
