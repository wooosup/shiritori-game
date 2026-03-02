interface InlineStateProps {
  type: 'error' | 'empty' | 'loading';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const STYLE_BY_TYPE = {
  error:
    'border-red-100 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200',
  empty:
    'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200',
  loading:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
} as const;

export default function InlineState({ type, message, actionLabel, onAction }: Readonly<InlineStateProps>) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${STYLE_BY_TYPE[type]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold">{message}</p>
        {actionLabel && onAction ? (
          <button
            data-sfx="off"
            onClick={onAction}
            className="text-xs font-bold underline underline-offset-2"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
