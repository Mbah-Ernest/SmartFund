import InfoTooltip from '../modules/personalFinance/components/InfoTooltip';

type StatCardProps = {
  title: string;
  value: string;
  caption?: string;
  description?: string;
  icon?: React.ReactNode;
  loading?: boolean;
};

export default function StatCard({
  title,
  value,
  caption,
  description,
  icon,
  loading
}: StatCardProps) {
  return (
    <div className="group relative isolate overflow-visible rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.08)] hover:-translate-y-0.5 dark:bg-slate-900 dark:ring-slate-800">
      {icon ? (
        <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/60 text-blue-500 shadow-sm ring-1 ring-blue-100/80 transition-transform duration-300 group-hover:scale-105 dark:from-blue-950/50 dark:to-blue-900/30 dark:text-blue-400 dark:ring-blue-900/50">
          {icon}
        </div>
      ) : null}

      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-400">
            {title}
          </span>
          {description ? <InfoTooltip text={description} /> : null}
        </div>

        <div className="mt-1.5 text-[26px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums dark:text-slate-50">
          {loading ? (
            <span className="relative inline-block h-8 w-28 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" />
            </span>
          ) : (
            value
          )}
        </div>

        {caption ? (
          <div className="mt-1.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">{caption}</div>
        ) : null}
      </div>
    </div>
  );
}
