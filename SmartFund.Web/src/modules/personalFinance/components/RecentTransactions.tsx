import { useState } from 'react';
import type { PersonalTransactionDto } from '../types/financeTypes';

type RecentTransactionsProps = {
  data: PersonalTransactionDto[];
  loading?: boolean;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(n);
}

type SortField = 'input-desc' | 'input-asc' | 'date-desc' | 'date-asc';

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'input-desc', label: 'Newest first (input time)' },
  { value: 'input-asc', label: 'Oldest first (input time)' },
  { value: 'date-desc', label: 'Transaction date ↓' },
  { value: 'date-asc', label: 'Transaction date ↑' }
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function RecentTransactions({
  data,
  loading
}: RecentTransactionsProps) {
  const [sortBy, setSortBy] = useState<SortField>('input-desc');

  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-2 py-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="relative h-3 w-28 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" />
              </div>
              <div className="relative h-2.5 w-20 overflow-hidden rounded bg-slate-50 dark:bg-slate-800/60">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" />
              </div>
            </div>
            <div className="relative h-3.5 w-20 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-52 flex-col items-center justify-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
          <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">No transactions recorded yet</p>
        <p className="text-xs text-slate-400">Your recent activity will show here</p>
      </div>
    );
  }

  const sorted = (() => {
    const list = [...data];
    switch (sortBy) {
      case 'input-desc':
        return list.sort((a, b) => b.id - a.id);
      case 'input-asc':
        return list.sort((a, b) => a.id - b.id);
      case 'date-desc':
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);
      case 'date-asc':
        return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
      default:
        return list;
    }
  })();

  const items = sorted.slice(0, 8);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-3L16.5 18m0 0L12 13.5M16.5 18V4.5" />
          </svg>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="bg-transparent text-[11px] font-semibold text-slate-600 focus:outline-none dark:text-slate-300"
            aria-label="Arrange transactions"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <ul className="-mx-2 space-y-0.5">
        {items.map((tx, idx) => {
          const t = tx.type.toLowerCase();
          const isInflow = t === 'income';
          const isOutflow = t === 'expense' || t === 'investment';

          return (
            <li
              key={tx.id}
              className="animate-fade-in-up flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 hover:bg-slate-50/80 hover:shadow-sm dark:hover:bg-slate-800/40"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${
                  isInflow
                    ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/60 text-emerald-500 ring-1 ring-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800/50'
                    : isOutflow
                      ? 'bg-gradient-to-br from-rose-50 to-rose-100/60 text-rose-500 ring-1 ring-rose-100 dark:from-rose-950/40 dark:to-rose-900/20 dark:text-rose-400 dark:ring-rose-800/50'
                      : 'bg-gradient-to-br from-blue-50 to-blue-100/60 text-blue-500 ring-1 ring-blue-100 dark:from-blue-950/40 dark:to-blue-900/20 dark:text-blue-400 dark:ring-blue-800/50'
                }`}
              >
                {isInflow ? '↑' : isOutflow ? '↓' : '↔'}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {tx.description || tx.category}
                </p>
                <p className="text-xs text-slate-400">
                  {tx.wallet} · {formatDate(tx.date)}
                </p>
              </div>

              <span
                className={`text-sm font-bold tabular-nums ${
                  isInflow
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isOutflow
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {isInflow ? '+' : isOutflow ? '−' : ''}
                {formatCurrency(tx.amount)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
