type StatCardProps = {
  title: string;
  value: string;
  caption?: string;
  loading?: boolean;
};

export default function StatCard({
  title,
  value,
  caption,
  loading
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </div>

      <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
        {loading ? <span className="text-slate-400">…</span> : value}
      </div>

      {caption ? (
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{caption}</div>
      ) : null}
    </div>
  );
}
