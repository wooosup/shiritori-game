import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuizModal, { type QuizModalPreset } from './QuizModal';
import { apiClient } from '../api/axios';

vi.mock('../api/axios', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock('../api/error', () => ({
  getApiErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

const quizPayload = {
  data: {
    code: 200,
    data: [
      {
        id: 1,
        question: 'りんご',
        answer: '사과',
        options: ['사과', '귤', '포도', '배'],
      },
    ],
  },
};

describe('QuizModal', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.get).mockResolvedValue(quizPayload as never);
  });

  it('opens selected review quiz with preset wordbook ids', async () => {
    const preset: QuizModalPreset = {
      mode: 'selected',
      selectedWordBookIds: [31, 12],
      title: '복습 퀴즈',
      subtitle: '방금 플레이한 단어를 다시 봐요.',
    };

    render(<QuizModal isOpen onClose={vi.fn()} preset={preset} />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/wordBooks/quiz', {
        params: {
          mode: 'selected',
          selectedWordBookIds: '31,12',
        },
      });
    });

    expect(screen.getByText('복습 퀴즈')).toBeTruthy();
    expect(screen.getByText('방금 플레이한 단어를 다시 봐요.')).toBeTruthy();
  });

  it('switches focus mode and level filters for normal quiz', async () => {
    render(<QuizModal isOpen onClose={vi.fn()} />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/wordBooks/quiz', {
        params: {
          mode: 'recent',
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: '집중 복습' }));

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenLastCalledWith('/wordBooks/quiz', {
        params: {
          mode: 'focus',
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'N3' }));

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenLastCalledWith('/wordBooks/quiz', {
        params: {
          mode: 'focus',
          level: 'N3',
        },
      });
    });
  });
});
