import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getBudgets,
  getBudgetTracking,
  createBudget,
  getCategories
} from '../services/personalFinanceApi';
import type { BudgetDto, BudgetTrackingDto, PersonalCategoryDto } from '../types/financeTypes';
import { PERSONAL_CATEGORY_TYPE } from '../types/financeTypes';

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

type TrackingMap = Record<number, BudgetTrackingDto[]>;

export default function BudgetPage() {
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<BudgetDto[]>([]);
  const [trackingMap, setTrackingMap] = useState<TrackingMap>({});
  const [categories, setCategories] = useState<PersonalCategoryDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* form */
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState<number>(1);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetList, cats] = await Promise.all(
        [getBudgets(), getCategories()] as const
      );
      setBudgets(budgetList);
      setCategories(cats);

      const trackingEntries = await Promise.all(
        budgetList.map(async (b) => {
          const tracking = await getBudgetTracking(b.id);
          return [b.id, tracking] as const;
        })
      );
      setTrackingMap(Object.fromEntries(trackingEntries));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  }, []);

  const expenseCategories = categories.filter(
    c => c.type === PERSONAL_CATEGORY_TYPE.Expense
  );

  const categoryNameById = useMemo(() => {
    return new Map(categories.map(c => [c.id, c.name] as const));
  }, [categories]);

  useEffect(() => {
    if (expenseCategories.length === 0) return;
    if (!expenseCategories.some(c => c.id === categoryId)) {
      setCategoryId(expenseCategories[0].id);
    }
  }, [expenseCategories, categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) throw new Error('Enter a valid amount.');
      await createBudget({ categoryId, amount: amt, period: 1 });
      setAmount('');
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create budget.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Budgets
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Set spending limits per category and track progress.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-[0.97]"
        >
          {showForm ? 'Cancel' : '+ New Budget'}
        </button>
      </div>

      {error ? (
        <div className="animate-fade-in-up flex items-start gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-50/60 px-5 py-4 shadow-sm dark:border-rose-900/50 dark:from-rose-950/30 dark:to-rose-950/20">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Error</p>
            <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 space-y-4 dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Category
              </span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                disabled={expenseCategories.length === 0}
              >
                {expenseCategories.length === 0 ? (
                  <option value={0}>No expense categories available</option>
                ) : (
                  expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
              {expenseCategories.length === 0 ? (
                <p className="mt-1 text-[11px] text-slate-400">
                  No expense categories yet.{' '}
                  <Link
                    to="/finance/categories"
                    className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700"
                  >
                    Create a category
                  </Link>
                  .
                </p>
              ) : null}
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Monthly Limit
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? 'Creating…' : 'Create Budget'}
          </button>
        </form>
      ) : null}

      {/* Budget cards */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="relative h-52 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/60 p-6 dark:bg-slate-900 dark:ring-slate-800">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div className="relative h-3 w-24 overflow-hidden rounded bg-slate-100 dark:bg-slate-800"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" /></div>
                  <div className="relative h-5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" /></div>
                </div>
                <div className="relative h-7 w-32 overflow-hidden rounded bg-slate-100 dark:bg-slate-800"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" /></div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="h-2.5 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="flex h-52 flex-col items-center justify-center gap-3 rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
            <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-500">No budgets created yet</p>
          <p className="text-xs text-slate-400">Click &quot;+ New Budget&quot; to get started</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => {
            const tracking = trackingMap[b.id] ?? [];
            const latest = tracking.length > 0 ? tracking[tracking.length - 1] : null;
            const spent = latest?.spentAmount ?? 0;
            const remaining = latest?.remainingAmount ?? b.amount;
            const pct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
            const overBudget = latest?.isOverBudget ?? false;

            return (
              <div
                key={b.id}
                className="group rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.10)] hover:-translate-y-0.5 dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-100">
                    {categoryNameById.get(b.categoryId) ?? `Category #${b.categoryId}`}
                  </h3>
                  {overBudget ? (
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800">
                      Over budget
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800">
                      On track
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs font-medium text-slate-400">
                  Category ID: {b.categoryId}
                </p>

                <p className="mt-3 text-[28px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
                  {formatCurrency(b.amount)}
                  <span className="text-sm font-normal text-slate-400">
                    {' '}/ month
                  </span>
                </p>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span>Spent: {formatCurrency(spent)}</span>
                    <span>
                      {remaining >= 0
                        ? `${formatCurrency(remaining)} left`
                        : `${formatCurrency(Math.abs(remaining))} over`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        overBudget ? 'bg-gradient-to-r from-rose-400 to-rose-500' : 'bg-gradient-to-r from-blue-400 to-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Monthly tracking */}
                {tracking.length > 0 ? (
                  <div className="mt-4 space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      History
                    </p>
                    {tracking
                      .slice(-3)
                      .reverse()
                      .map((t, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-xs text-slate-600 dark:text-slate-300"
                        >
                          <span>
                            {MONTH_NAMES[t.month]} {t.year}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(t.spentAmount)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
