import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api/axios', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock('./stores/authStore', () => ({
  useAuthStore: () => ({
    setSession: vi.fn(),
  }),
}));

vi.mock('./pages/Home', () => ({
  default: () => <div>HOME_PAGE</div>,
}));

vi.mock('./pages/GamePage', () => ({
  default: () => <div>GAME_PAGE</div>,
}));

vi.mock('./platform/auth', () => ({
  isNativeRuntime: () => false,
  handleAuthCallbackUrl: vi.fn(),
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(),
  },
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    close: vi.fn(),
  },
}));

import App from './App';

describe('App router', () => {
  beforeEach(() => {
    window.location.hash = '#/';
  });

  it('renders home route under hash router', async () => {
    render(<App />);
    expect(await screen.findByText('HOME_PAGE')).toBeInTheDocument();
  });
});
