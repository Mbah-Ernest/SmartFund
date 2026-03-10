import type { CashFlowRow } from '../types/financeTypes';

type RecentTransactionsProps = {
  data: CashFlowRow[];
  loading?: boolean;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(n);
}

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function RecentTransactions({
  data,
  loading
}: RecentTransactionsProps) {
  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-100">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="relative h-3 w-28 overflow-hidden rounded bg-slate-100">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              </div>
              <div className="relative h-2.5 w-20 overflow-hidden rounded bg-slate-50">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              </div>
            </div>
            <div className="relative h-3.5 w-20 overflow-hidden rounded bg-slate-100">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
          <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">No transactions recorded yet</p>
        <p className="text-xs text-slate-400">Your recent activity will show here</p>
      </div>
    );
  }

  /* Show latest entries (sorted desc by year/month) */
  const sorted = [...data].sort(
    (a, b) => b.year - a.year || b.month - a.month
  );
  const items = sorted.slice(0, 8);

  return (
    <ul className="-mx-2 space-y-0.5">
      {items.map((row, idx) => {
        const isInflow = row.inflow > 0 && row.outflow === 0;
        return (
          <li
            key={idx}
            className="animate-fade-in-up flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 hover:bg-slate-50/80 hover:shadow-sm"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${
                isInflow
                  ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/60 text-emerald-500 ring-1 ring-emerald-100'
                  : 'bg-gradient-to-br from-rose-50 to-rose-100/60 text-rose-500 ring-1 ring-rose-100'
              }`}
            >
              {isInflow ? '↑' : '↓'}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {row.categoryName}
              </p>
              <p className="text-xs text-slate-400">
                {row.walletName} · {MONTH_NAMES[row.month]} {row.year}
              </p>
            </div>

            <span
              className={`text-sm font-bold tabular-nums ${
                isInflow ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {isInflow ? '+' : '−'}
              {formatCurrency(isInflow ? row.inflow : row.outflow)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
