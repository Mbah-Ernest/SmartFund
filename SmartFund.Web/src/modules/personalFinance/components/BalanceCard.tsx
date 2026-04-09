import InfoTooltip from './InfoTooltip';

type ColorAccent = 'blue' | 'emerald' | 'rose' | 'violet';

type BalanceCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  description?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  loading?: boolean;
  action?: React.ReactNode;
  colorAccent?: ColorAccent;
};

const accentMap: Record<ColorAccent, {
  orb: string;
  accent: string;
  icon: string;
}> = {
  blue: {
    orb: 'from-blue-100/80 to-blue-50/40',
    accent: 'via-blue-400/40',
    icon: 'from-blue-50 to-blue-100/60 text-blue-500 ring-blue-100/80 dark:from-blue-950/50 dark:to-blue-900/30 dark:text-blue-400 dark:ring-blue-900/50',
  },
  emerald: {
    orb: 'from-emerald-100/80 to-emerald-50/40',
    accent: 'via-emerald-400/40',
    icon: 'from-emerald-50 to-emerald-100/60 text-emerald-500 ring-emerald-100/80 dark:from-emerald-950/50 dark:to-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-900/50',
  },
  rose: {
    orb: 'from-rose-100/80 to-rose-50/40',
    accent: 'via-rose-400/40',
    icon: 'from-rose-50 to-rose-100/60 text-rose-500 ring-rose-100/80 dark:from-rose-950/50 dark:to-rose-900/30 dark:text-rose-400 dark:ring-rose-900/50',
  },
  violet: {
    orb: 'from-violet-100/80 to-violet-50/40',
    accent: 'via-violet-400/40',
    icon: 'from-violet-50 to-violet-100/60 text-violet-500 ring-violet-100/80 dark:from-violet-950/50 dark:to-violet-900/30 dark:text-violet-400 dark:ring-violet-900/50',
  },
};

export default function BalanceCard({
  title,
  value,
  subtitle,
  description,
  icon,
  trend,
  loading,
  action,
  colorAccent = 'blue',
}: BalanceCardProps) {
  const colors = accentMap[colorAccent];

  return (
    <div className="group relative isolate h-full min-h-[186px] overflow-hidden rounded-2xl bg-card p-4 sm:p-5 shadow-sm ring-1 ring-border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      {/* decorative gradient orb */}
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${colors.orb} opacity-0 blur-sm transition-all duration-500 group-hover:opacity-100 group-hover:scale-110`} />
      {/* bottom edge accent line */}
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent ${colors.accent} to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />

      <div className="relative flex items-start justify-between">
        <div className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br ${colors.icon} shadow-sm ring-1 transition-transform duration-300 group-hover:scale-105`}>
          {icon}
        </div>

        <div className="flex items-center gap-1.5">
          {action}
          {description && <InfoTooltip text={description} />}
          {trend ? (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold tracking-wide transition-transform duration-300 group-hover:scale-105 ${
                trend.positive
                  ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800'
                  : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800'
              }`}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        <p className="mt-1.5 text-[30px] sm:text-[32px] font-extrabold leading-none tracking-tight tabular-nums">
          {loading ? (
            <span className="relative inline-block h-8 w-32 overflow-hidden rounded-lg bg-muted">
              <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" />
            </span>
          ) : (
            value
          )}
        </p>
        {loading ? (
          <span className="mt-2 inline-block h-3.5 w-24 overflow-hidden rounded bg-muted">
            <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" />
          </span>
        ) : subtitle ? (
          <p className="mt-1 text-[13px] font-medium text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
