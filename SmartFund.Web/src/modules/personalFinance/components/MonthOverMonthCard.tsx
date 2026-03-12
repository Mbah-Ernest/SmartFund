import type { MonthlyIncomeExpense } from '../types/financeTypes';

type MonthOverMonthCardProps = {
  data: MonthlyIncomeExpense[];
  loading?: boolean;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(n);
}

function pctLabel(curr: number, prev: number): { text: string; positive: boolean } | null {
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return { text: 'new', positive: curr >= 0 };
  const pct = ((curr - prev) / prev) * 100;
  const sign = pct >= 0 ? '+' : '';
  return { text: `${sign}${pct.toFixed(0)}%`, positive: pct <= 0 };
}

function CompareRow(props: {
  label: string;
  prevValue: number;
  currValue: number;
  prevMonth: string;
  currMonth: string;
  invertPositive?: boolean;
}) {
  const max = Math.max(props.prevValue, props.currValue, 1);
  const prevPct = (props.prevValue / max) * 100;
  const currPct = (props.currValue / max) * 100;
  const change = pctLabel(props.currValue, props.prevValue);

  const isUp = props.currValue >= props.prevValue;
  const positive = props.invertPositive ? !isUp : isUp;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{props.label}</p>
        {change && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              positive
                ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800'
                : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-800'
            }`}
          >
            {change.text} vs {props.prevMonth}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-8 text-[10px] font-medium text-slate-400">{props.prevMonth}</span>
          <div className="flex-1 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-slate-300 dark:bg-slate-600 transition-all duration-700"
              style={{ width: `${Math.min(prevPct, 100)}%` }}
            />
          </div>
          <span className="w-24 text-right text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">
            {formatCurrency(props.prevValue)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-8 text-[10px] font-bold text-slate-600 dark:text-slate-200">{props.currMonth}</span>
          <div className="flex-1 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                positive
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                  : 'bg-gradient-to-r from-rose-400 to-rose-500'
              }`}
              style={{ width: `${Math.min(currPct, 100)}%` }}
            />
          </div>
          <span className="w-24 text-right text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {formatCurrency(props.currValue)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MonthOverMonthCard({ data, loading }: MonthOverMonthCardProps) {
  if (loading) {
    return (
      <div className="space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
          <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">Need at least 2 months of data</p>
        <p className="text-xs text-slate-400">Keep recording transactions to unlock comparisons</p>
      </div>
    );
  }

  const prev = data[data.length - 2];
  const curr = data[data.length - 1];
  const prevSavings = prev.income - prev.expenses;
  const currSavings = curr.income - curr.expenses;

  return (
    <div className="space-y-5">
      <CompareRow
        label="💰 Income"
        prevValue={prev.income}
        currValue={curr.income}
        prevMonth={prev.month}
        currMonth={curr.month}
      />
      <CompareRow
        label="🛒 Expenses"
        prevValue={prev.expenses}
        currValue={curr.expenses}
        prevMonth={prev.month}
        currMonth={curr.month}
        invertPositive
      />
      <CompareRow
        label="🐷 Savings"
        prevValue={Math.max(prevSavings, 0)}
        currValue={Math.max(currSavings, 0)}
        prevMonth={prev.month}
        currMonth={curr.month}
      />
    </div>
  );
}
