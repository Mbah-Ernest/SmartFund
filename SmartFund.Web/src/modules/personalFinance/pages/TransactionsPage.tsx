import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getCashFlow,
  getCategories,
  getWallets,
  recordIncome,
  recordExpense,
  recordTransfer
} from '../services/personalFinanceApi';
import type { CashFlowRow, PersonalCategoryDto, PersonalWalletDto } from '../types/financeTypes';
import { PERSONAL_CATEGORY_TYPE } from '../types/financeTypes';

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(n);
}

type TxType = 'income' | 'expense' | 'transfer';

export default function TransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CashFlowRow[]>([]);
  const [wallets, setWallets] = useState<PersonalWalletDto[]>([]);
  const [categories, setCategories] = useState<PersonalCategoryDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* form state */
  const [showForm, setShowForm] = useState(false);
  const [txType, setTxType] = useState<TxType>('expense');
  const [walletId, setWalletId] = useState<number>(0);
  const [destWalletId, setDestWalletId] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<number>(1);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cf, w, cats] = await Promise.all([
        getCashFlow(),
        getWallets(),
        getCategories()
      ] as const);
      setRows(cf);
      setWallets(w);
      setCategories(cats);
      if (w.length > 0 && walletId === 0) setWalletId(w[0].id);
      if (w.length > 1 && destWalletId === 0) {
        const fallback = w.find((x) => x.id !== (walletId || w[0].id)) ?? w[0];
        setDestWalletId(fallback.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [walletId, destWalletId]);

  const filteredCategories = useMemo(() => {
    const type = txType === 'income'
      ? PERSONAL_CATEGORY_TYPE.Income
      : PERSONAL_CATEGORY_TYPE.Expense;

    return categories.filter(c => c.type === type);
  }, [categories, txType]);

  useEffect(() => {
    if (txType === 'transfer') return;
    if (filteredCategories.length === 0) return;
    if (!filteredCategories.some(c => c.id === categoryId)) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [txType, filteredCategories, categoryId]);

  useEffect(() => {
    if (txType !== 'transfer') return;
    if (wallets.length === 0) return;
    if (destWalletId === 0) {
      const fallback = wallets.find(x => x.id !== walletId) ?? wallets[0];
      setDestWalletId(fallback.id);
      return;
    }
    if (destWalletId === walletId) {
      const fallback = wallets.find(x => x.id !== walletId) ?? wallets[0];
      setDestWalletId(fallback.id);
    }
  }, [txType, wallets, walletId, destWalletId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) throw new Error('Enter a valid amount.');

      if (txType === 'income') {
        await recordIncome({ walletId, categoryId, amount: amt, description, date });
      } else if (txType === 'expense') {
        await recordExpense({ walletId, categoryId, amount: amt, description, date });
      } else {
        await recordTransfer({
          sourceWalletId: walletId,
          destinationWalletId: destWalletId,
          amount: amt,
          description,
          date
        });
      }

      setAmount('');
      setDescription('');
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record transaction.');
    } finally {
      setSubmitting(false);
    }
  }

  const sorted = [...rows].sort(
    (a, b) => b.year - a.year || b.month - a.month
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            View and record your personal finance transactions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-[0.97]"
        >
          {showForm ? 'Cancel' : '+ New Transaction'}
        </button>
      </div>

      {error ? (
        <div className="animate-fade-in-up flex items-start gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-50/60 px-5 py-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-800">Error</p>
            <p className="mt-0.5 text-sm text-rose-700">{error}</p>
          </div>
        </div>
      ) : null}

      {/* Record form */}
      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 space-y-4 dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="flex gap-2">
            {(['income', 'expense', 'transfer'] as TxType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTxType(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  txType === t
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">
                {txType === 'transfer' ? 'Source Wallet' : 'Wallet'}
              </span>
              <select
                value={walletId}
                onChange={(e) => setWalletId(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>

            {txType === 'transfer' ? (
              <label className="block">
                <span className="text-xs font-medium text-slate-600">
                  Destination Wallet
                </span>
                <select
                  value={destWalletId}
                  onChange={(e) => setDestWalletId(Number(e.target.value))}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="block">
                <span className="text-xs font-medium text-slate-600">
                  Category
                </span>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  disabled={filteredCategories.length === 0}
                >
                  {filteredCategories.length === 0 ? (
                    <option value={0}>No categories available</option>
                  ) : (
                    filteredCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  {txType === 'income'
                    ? 'Choose where the income should be categorized.'
                    : 'Choose what this expense is for.'}
                </p>
                {filteredCategories.length === 0 ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    No categories yet.{' '}
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
            )}

            <label className="block">
              <span className="text-xs font-medium text-slate-600">Amount</span>
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

            <label className="block">
              <span className="text-xs font-medium text-slate-600">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">
              Description
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note"
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? 'Saving…' : 'Record Transaction'}
          </button>
        </form>
      ) : null}

      {/* Transactions table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Period</th>
              <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Wallet</th>
              <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Category</th>
              <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Inflow</th>
              <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Outflow</th>
              <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-5 py-3.5">
                      <div className="relative h-3 w-20 overflow-hidden rounded bg-slate-100">
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                      <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-500">No transactions found</p>
                    <p className="text-xs text-slate-400">Click &quot;+ New Transaction&quot; to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-50 transition-colors hover:bg-blue-50/30"
                >
                  <td className="px-5 py-3 text-slate-700">
                    {MONTH_NAMES[row.month]} {row.year}
                  </td>
                  <td className="px-5 py-3 text-slate-700">{row.walletName}</td>
                  <td className="px-5 py-3 text-slate-700">{row.categoryName}</td>
                  <td className="px-5 py-3 text-right font-medium text-emerald-600">
                    {row.inflow > 0 ? formatCurrency(row.inflow) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-rose-600">
                    {row.outflow > 0 ? formatCurrency(row.outflow) : '—'}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-semibold ${
                      row.net >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(row.net)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
