import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getTransactions,
  getCategories,
  getWallets,
  recordIncome,
  recordExpense,
  recordTransfer,
  recordInvestmentContribution
} from '../services/personalFinanceApi';
import { getTranches } from '../../../api/tranchesApi';
import type { PersonalTransactionDto, PersonalCategoryDto, PersonalWalletDto } from '../types/financeTypes';
import { PERSONAL_CATEGORY_TYPE } from '../types/financeTypes';
import type { TrancheDto } from '../../../types/api';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(n);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

type TxType = 'income' | 'expense' | 'transfer' | 'investment';

type SortField = 'newest' | 'oldest' | 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'newest', label: 'Newest first (input time)' },
  { value: 'oldest', label: 'Oldest first (input time)' },
  { value: 'date-desc', label: 'Transaction date ↓' },
  { value: 'date-asc', label: 'Transaction date ↑' },
  { value: 'amount-desc', label: 'Amount ↓ (highest)' },
  { value: 'amount-asc', label: 'Amount ↑ (lowest)' },
];

export default function TransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PersonalTransactionDto[]>([]);
  const [wallets, setWallets] = useState<PersonalWalletDto[]>([]);
  const [categories, setCategories] = useState<PersonalCategoryDto[]>([]);
  const [tranches, setTranches] = useState<TrancheDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortField>('newest');
  const [filterType, setFilterType] = useState<string>('all');

  /* form state */
  const [showForm, setShowForm] = useState(false);
  const [txType, setTxType] = useState<TxType>('expense');
  const [walletId, setWalletId] = useState<number>(0);
  const [destWalletId, setDestWalletId] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<number>(1);
  const [trancheId, setTrancheId] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [txs, w, cats, t] = await Promise.all([
        getTransactions(),
        getWallets(),
        getCategories(),
        getTranches()
      ] as const);
      setRows(txs);
      setWallets(w);
      setCategories(cats);
      setTranches(t);
      if (w.length > 0 && walletId === 0) setWalletId(w[0].id);
      if (w.length > 1 && destWalletId === 0) {
        const fallback = w.find((x) => x.id !== (walletId || w[0].id)) ?? w[0];
        setDestWalletId(fallback.id);
      }
      if (t.length > 0 && trancheId === 0) setTrancheId(t[0].id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, [walletId, destWalletId, trancheId]);

  const filteredCategories = useMemo(() => {
    if (txType === 'transfer' || txType === 'investment') return [];
    const type = txType === 'income'
      ? PERSONAL_CATEGORY_TYPE.Income
      : PERSONAL_CATEGORY_TYPE.Expense;

    return categories.filter(c => c.type === type);
  }, [categories, txType]);

  useEffect(() => {
    if (txType === 'transfer' || txType === 'investment') return;
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
    if (txType !== 'investment') return;
    if (tranches.length === 0) return;
    if (trancheId === 0 || !tranches.some(t => t.id === trancheId)) {
      setTrancheId(tranches[0].id);
    }
  }, [txType, tranches, trancheId]);

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
      } else if (txType === 'investment') {
        if (trancheId <= 0) throw new Error('Select an investment tranche.');
        await recordInvestmentContribution({ walletId, trancheId, amount: amt, description });
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

  const filtered = useMemo(() => {
    if (filterType === 'all') return rows;
    return rows.filter(r => r.type.toLowerCase() === filterType);
  }, [rows, filterType]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortBy) {
      case 'newest':
        return list.sort((a, b) => b.id - a.id);
      case 'oldest':
        return list.sort((a, b) => a.id - b.id);
      case 'date-desc':
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);
      case 'date-asc':
        return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
      case 'amount-desc':
        return list.sort((a, b) => b.amount - a.amount || b.id - a.id);
      case 'amount-asc':
        return list.sort((a, b) => a.amount - b.amount || a.id - b.id);
      default:
        return list;
    }
  }, [filtered, sortBy]);

  const typePillCls = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'income') return 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400';
    if (t === 'expense') return 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400';
    if (t === 'transfer') return 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400';
    return 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400';
  };

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

      {/* Record form */}
      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 space-y-4 dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="flex gap-2">
            {(['income', 'expense', 'transfer', 'investment'] as TxType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTxType(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  txType === t
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {t === 'investment' ? 'Invest' : t}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {txType === 'transfer' ? 'Source Wallet' : txType === 'investment' ? 'From Wallet' : 'Wallet'}
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
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
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
            ) : txType === 'investment' ? (
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Investment Tranche
                </span>
                <select
                  value={trancheId}
                  onChange={(e) => setTrancheId(Number(e.target.value))}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  disabled={tranches.length === 0}
                >
                  {tranches.length === 0 ? (
                    <option value={0}>No tranches available</option>
                  ) : (
                    tranches.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.trancheCode}
                      </option>
                    ))
                  )}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Select the tranche to send money into (Investment Management).
                </p>
              </label>
            ) : (
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
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
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Amount</span>
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
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Date</span>
              {txType === 'investment' ? (
                <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  Uses current time
                </div>
              ) : (
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              )}
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
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

      {/* Sort & filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sort dropdown */}
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-3L16.5 18m0 0L12 13.5M16.5 18V4.5" />
          </svg>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="bg-transparent text-xs font-semibold text-slate-600 focus:outline-none dark:text-slate-300"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Type filter pills */}
        {['all', 'income', 'expense', 'transfer', 'investment'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilterType(t)}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold capitalize transition-all ${
              filterType === t
                ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/25'
                : 'bg-white text-slate-500 ring-1 ring-slate-200/60 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            {t === 'all' ? 'All' : t}
          </button>
        ))}

        <span className="ml-auto text-xs tabular-nums text-slate-400">{sorted.length} transaction(s)</span>
      </div>

      {/* Transactions list */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-500 dark:border-slate-700 dark:border-t-blue-400" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
                <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-500">No transactions found</p>
              <p className="text-xs text-slate-400">Click &quot;+ New Transaction&quot; to get started</p>
            </div>
          </div>
        ) : (
          sorted.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-200/60 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(59,130,246,0.06)] dark:bg-slate-900 dark:ring-slate-800"
            >
              {/* Type badge */}
              <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${typePillCls(tx.type)}`}>
                {tx.type}
              </span>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {tx.description || tx.category}
                  </span>
                  {tx.sourceBankLabel && (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      {tx.sourceBankLabel}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{tx.wallet}</span>
                  {tx.description && tx.category !== '—' ? (
                    <>
                      <span>·</span>
                      <span>{tx.category}</span>
                    </>
                  ) : null}
                  <span>·</span>
                  <span>{formatDate(tx.date)}</span>
                  <span>·</span>
                  <span className="font-mono">#{tx.id}</span>
                </div>
              </div>

              {/* Amount */}
              <span
                className={`shrink-0 text-sm font-bold tabular-nums ${
                  tx.type.toLowerCase() === 'income'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : tx.type.toLowerCase() === 'expense' || tx.type.toLowerCase() === 'investment'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {tx.type.toLowerCase() === 'income' ? '+' : tx.type.toLowerCase() === 'transfer' ? '' : '−'}
                {formatCurrency(tx.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
