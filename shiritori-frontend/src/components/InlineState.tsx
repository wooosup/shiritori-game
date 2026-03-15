interface InlineStateProps {
  type: 'error' | 'empty' | 'loading';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionTarget?: '_self' | '_blank';
}

const STYLE_BY_TYPE = {
  error:
    'border-red-100 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200',
  empty:
    'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200',
  loading:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
} as const;

export default function InlineState({
  type,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  secondaryActionTarget = '_self',
}: Readonly<InlineStateProps>) {
  const hasPrimaryAction = actionLabel && onAction;
  const hasSecondaryAction = secondaryActionLabel && secondaryActionHref;

  return (
    <div className={`rounded-xl border px-3 py-2 ${STYLE_BY_TYPE[type]}`}>
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 flex-1 text-xs font-semibold">{message}</p>
        {(hasPrimaryAction || hasSecondaryAction) ? (
          <div className="flex w-full shrink-0 items-center gap-3 sm:w-auto">
            {hasPrimaryAction ? (
              <button
                data-sfx="off"
                onClick={onAction}
                className="text-xs font-bold underline underline-offset-2"
              >
                {actionLabel}
              </button>
            ) : null}
            {hasSecondaryAction ? (
              <a
                href={secondaryActionHref}
                target={secondaryActionTarget}
                rel={secondaryActionTarget === '_blank' ? 'noreferrer' : undefined}
                className="text-xs font-bold underline underline-offset-2"
              >
                {secondaryActionLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
