import {
  HomeIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  TrophyIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

export type BottomTabKey = 'home' | 'wordbook' | 'quiz' | 'ranking' | 'options';

interface BottomTabBarProps {
  current: BottomTabKey;
  onHome: () => void;
  onWordBook: () => void;
  onQuiz: () => void;
  onRanking: () => void;
  onOptions: () => void;
}

interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
}

function TabButton({ label, active, onClick, icon }: Readonly<TabButtonProps>) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex h-12 w-1/5 flex-col items-center justify-center transition-all active:scale-95 ${
        active
          ? 'text-indigo-600 dark:text-indigo-300'
          : 'text-gray-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-300'
      }`}
    >
      <span className="mb-1 h-5 w-5">{icon}</span>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

export default function BottomTabBar({
  current,
  onHome,
  onWordBook,
  onQuiz,
  onRanking,
  onOptions,
}: Readonly<BottomTabBarProps>) {
  return (
    <nav className="z-20 flex w-full flex-none items-center justify-around border-t border-gray-100 bg-white pb-2 pt-2 pb-safe-bottom shadow-[0_-8px_20px_-1px_rgba(0,0,0,0.03)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
      <TabButton
        label="홈"
        active={current === 'home'}
        onClick={onHome}
        icon={<HomeIcon />}
      />
      <TabButton
        label="단어장"
        active={current === 'wordbook'}
        onClick={onWordBook}
        icon={<BookOpenIcon />}
      />
      <TabButton
        label="퀴즈"
        active={current === 'quiz'}
        onClick={onQuiz}
        icon={<QuestionMarkCircleIcon />}
      />
      <TabButton
        label="랭킹"
        active={current === 'ranking'}
        onClick={onRanking}
        icon={<TrophyIcon />}
      />
      <TabButton
        label="옵션"
        active={current === 'options'}
        onClick={onOptions}
        icon={<Cog6ToothIcon />}
      />
    </nav>
  );
}
