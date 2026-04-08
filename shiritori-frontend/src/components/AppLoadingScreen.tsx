interface AppLoadingScreenProps {
  message?: string;
}

export default function AppLoadingScreen({
  message = '이동 중이에요.',
}: Readonly<AppLoadingScreenProps>) {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(224,231,255,0.72)_0%,rgba(246,247,252,0.98)_42%,#f8f9ff_100%)] px-6 py-10 dark:bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18)_0%,rgba(11,18,32,0.98)_46%,#0b1220_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.58)_0%,rgba(255,255,255,0)_60%)] dark:bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.08)_0%,rgba(11,18,32,0)_62%)]" />

      <div className="relative flex w-full max-w-[18rem] flex-col items-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="animate-loader-pulse absolute inset-1 rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.18)_0%,rgba(99,102,241,0)_72%)] blur-[2px] dark:bg-[radial-gradient(circle,_rgba(96,165,250,0.16)_0%,rgba(96,165,250,0)_74%)]" />
          <div className="absolute inset-[6px] rounded-full border border-indigo-200/70 dark:border-indigo-300/10" />
          <div className="animate-loader-float relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-[linear-gradient(145deg,#635bff_0%,#4f46e5_58%,#6dafff_100%)] shadow-[0_24px_40px_-28px_rgba(79,70,229,0.62)]">
            <div className="absolute inset-[9px] rounded-[20px] border border-white/18 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22)_0%,_rgba(255,255,255,0)_66%)]" />
            <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_58%)] opacity-80" />
          <img
            src="/logo.png"
            alt=""
            className="relative h-11 w-11 rounded-2xl object-cover drop-shadow-[0_8px_18px_rgba(15,23,42,0.22)]"
          />
          </div>
        </div>

        <p className="mt-6 text-center text-[15px] font-semibold leading-6 text-slate-500 dark:text-slate-300">
          {message}
        </p>

        <div className="mt-5 h-1.5 w-full max-w-[15.5rem] overflow-hidden rounded-full bg-indigo-100/90 dark:bg-white/10">
          <div className="h-full w-[56%] animate-loader-progress rounded-full bg-[linear-gradient(90deg,#4f46e5_0%,#6366f1_50%,#60a5fa_100%)] shadow-[0_0_14px_rgba(99,102,241,0.24)]" />
        </div>
      </div>
    </div>
  );
}
