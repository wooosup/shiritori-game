import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameResultModal, { type GameResultWord } from './GameResultModal';

const words: GameResultWord[] = [
  { word: 'しりとり', reading: 'しりとり', meaning: '끝말잇기' },
  { word: 'りんご', meaning: '사과' },
];

describe('GameResultModal', () => {
  it('renders score/combo and word list with action buttons', () => {
    const onSaveWord = vi.fn();
    const onPlayAgain = vi.fn();
    const onGoHome = vi.fn();
    const onClose = vi.fn();

    render(
      <GameResultModal
        isOpen
        resultType="win"
        message="새로운 기록!"
        score={1234}
        combo={7}
        isNewRecord
        words={words}
        onSaveWord={onSaveWord}
        onPlayAgain={onPlayAgain}
        onGoHome={onGoHome}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('YOU WIN!')).toBeTruthy();
    expect(screen.getByText(/1,234/)).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getAllByText('저장').length).toBe(2);

    fireEvent.click(screen.getAllByText('저장')[0]);
    expect(onSaveWord).toHaveBeenCalledWith(words[0].word);

    fireEvent.click(screen.getByRole('button', { name: '다시 하기' }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '메인으로' }));
    expect(onGoHome).toHaveBeenCalledTimes(1);
  });
});
