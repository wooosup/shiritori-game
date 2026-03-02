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

vi.mock('./pages/WordBookPage', () => ({
  default: () => (
    <div>
      <h1>나만의 단어장</h1>
      <button aria-current="page">단어장</button>
      <input placeholder="단어를 추가하세요" />
    </div>
  ),
}));

vi.mock('./pages/RankingPage', () => ({
  default: () => (
    <div>
      <h1>랭킹</h1>
      <button aria-current="page">랭킹</button>
    </div>
  ),
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

describe('App navigation', () => {
  beforeEach(() => {
    window.location.hash = '#/';
  });

  it('renders wordbook page on hash route', async () => {
    window.location.hash = '#/wordbook';
    render(<App />);

    expect(await screen.findByText('나만의 단어장')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('단어를 추가하세요')).toBeInTheDocument();
  });

  it('renders ranking page on hash route', async () => {
    window.location.hash = '#/ranking';
    render(<App />);

    expect(await screen.findByRole('heading', { name: '랭킹' })).toBeInTheDocument();
  });

  it('highlights ranking tab for ranking route', async () => {
    window.location.hash = '#/ranking';
    render(<App />);

    const rankingTab = await screen.findByRole('button', { name: '랭킹' });
    expect(rankingTab).toHaveAttribute('aria-current', 'page');
  });
});
