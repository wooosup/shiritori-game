import { useMemo, useState } from 'react';
import { markOnboardingSeen } from '../lib/onboarding';

// Reusable modal guiding first-time players through the onboarding steps.

interface Step {
  title: string;
  description: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  ctaLabel: string;
  onCta: () => void;
  onClose: () => void;
}

const STEPS: Step[] = [
  {
    title: '끝말잇기 규칙',
    description: 'AI가 낸 단어의 끝 글자로 시작하는 단어를 입력하고, 20초 내에 계속 이어가세요.',
  },
  {
    title: '점수와 콤보',
    description: '콤보가 이어질수록 점수가 빠르게 불어나며, 콤보가 끊기면 추가 점수 흐름도 다시 쌓아야 해요.',
  },
  {
    title: 'PASS와 포기',
    description: 'PASS는 AI가 대신 이어가게 하고, 포기는 게임을 종료합니다—PASS를 관리하면 오래 버틸 수 있어요.',
  },
  {
    title: '단어장과 퀴즈',
    description: '결과 화면에서 단어장을 저장하고 퀴즈로 복습하면 배운 단어를 다시 만날 수 있어요.',
  },
];

export default function OnboardingModal({ isOpen, ctaLabel, onCta, onClose }: Readonly<OnboardingModalProps>) {
  const [currentStep, setCurrentStep] = useState(0);

  const progress = useMemo(() => (currentStep / (STEPS.length - 1)) * 100, [currentStep]);

  if (!isOpen) {
    return null;
  }

  const step = STEPS[currentStep];

  const handleNext = () => {
    if (currentStep === STEPS.length - 1) {
      markOnboardingSeen();
      onCta();
      onClose();
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleSkip = () => {
    markOnboardingSeen();
    onClose();
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-[360px] rounded-3xl bg-white p-6 shadow-2xl text-center">
        <div className="mb-4 text-xs uppercase tracking-[0.4em] text-gray-400">첫 실행 안내</div>
        <div className="text-base font-bold text-slate-600">{step.title}</div>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">{step.description}</p>

        <div className="mt-5 rounded-full bg-slate-100 h-2 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-500 to-emerald-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex-1 rounded-2xl border border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-500 disabled:text-gray-300 disabled:border-gray-100"
          >
            이전
          </button>
          <div className="text-xs text-gray-400">
            {currentStep + 1} / {STEPS.length}
          </div>
          <button
            onClick={handleSkip}
            className="flex-1 rounded-2xl border border-transparent bg-transparent px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500"
          >
            건너뛰기
          </button>
        </div>

        <button
          onClick={handleNext}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-emerald-500 py-3 text-sm font-black text-white shadow-lg shadow-indigo-400/30 transition duration-150 hover:opacity-95 active:scale-[0.99]"
        >
          {currentStep === STEPS.length - 1 ? ctaLabel : '다음'}
        </button>
      </div>
    </div>
  );
}
