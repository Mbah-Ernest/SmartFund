type BalanceCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  loading?: boolean;
};

export default function BalanceCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  loading
}: BalanceCardProps) {
  return (
    <div className="group relative isolate overflow-hidden rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.10)] hover:-translate-y-0.5 dark:bg-slate-900 dark:ring-slate-800">
      {/* decorative gradient orb */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-blue-100/80 to-blue-50/40 opacity-0 blur-sm transition-all duration-500 group-hover:opacity-100 group-hover:scale-110" />
      {/* bottom edge accent line */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/60 text-blue-500 shadow-sm ring-1 ring-blue-100/80 transition-transform duration-300 group-hover:scale-105">
          {icon}
        </div>

        {trend ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide transition-transform duration-300 group-hover:scale-105 ${
              trend.positive
                ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
                : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
            }`}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        ) : null}
      </div>

      <div className="relative mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-400">
          {title}
        </p>
        <p className="mt-1.5 text-[28px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums dark:text-slate-50">
          {loading ? (
            <span className="relative inline-block h-8 w-32 overflow-hidden rounded-lg bg-slate-100">
              <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </span>
          ) : (
            value
          )}
        </p>
        {loading ? (
          <span className="mt-2 inline-block h-3.5 w-24 overflow-hidden rounded bg-slate-100">
            <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </span>
        ) : subtitle ? (
          <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
