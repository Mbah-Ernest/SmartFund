import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  getWallets,
  getWalletBalance,
  createWallet,
  getConnectedAccounts
} from '../services/personalFinanceApi';
import type { ConnectedBankAccountDto } from '../services/personalFinanceApi';
import type { PersonalWalletDto, WalletBalanceDto } from '../types/financeTypes';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(n);
}

type WalletWithBalance = PersonalWalletDto & { balance: number; isBankWallet: boolean };

export default function GoalsPage() {
  const [loading, setLoading] = useState(true);
  const [walletData, setWalletData] = useState<WalletWithBalance[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* new wallet form */
  const [showForm, setShowForm] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wallets, bankAccounts] = await Promise.all([getWallets(), getConnectedAccounts()]);

      // Build a set of wallet IDs that are linked to a bank account
      const bankWalletIds = new Set(
        bankAccounts
          .filter((a: ConnectedBankAccountDto) => a.personalWalletId != null)
          .map((a: ConnectedBankAccountDto) => a.personalWalletId as number)
      );

      const withBalances: WalletWithBalance[] = await Promise.all(
        wallets.map(async (w) => {
          let balance = 0;
          try {
            const b: WalletBalanceDto = await getWalletBalance(w.id);
            balance = b.balance;
          } catch {
            /* wallet balance may not exist yet */
          }
          return { ...w, balance, isBankWallet: bankWalletIds.has(w.id) };
        })
      );
      setWalletData(withBalances);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load wallets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalBalance = useMemo(
    () => walletData.reduce((sum, w) => sum + w.balance, 0),
    [walletData]
  );

  /* Simple chart: wallet balances as a bar-like area (one point per wallet) */
  const chartData = useMemo(
    () =>
      walletData.map((w) => ({
        name: w.name,
        balance: w.balance
      })),
    [walletData]
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!walletName.trim()) throw new Error('Enter a wallet name.');
      await createWallet({ name: walletName.trim(), currency });
      setWalletName('');
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Goals & Wallets
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your savings wallets and track progress toward financial goals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-[0.97]"
        >
          {showForm ? 'Cancel' : '+ New Wallet'}
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
                Wallet Name
              </span>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="e.g. Emergency Fund"
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                Currency
              </span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="NGN">NGN — Nigerian Naira</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? 'Creating…' : 'Create Wallet'}
          </button>
        </form>
      ) : null}

      {/* Total balance highlight */}
      <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-7 text-white shadow-xl shadow-blue-600/25">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-xl" />
        <p className="relative text-[13px] font-semibold text-blue-100">Combined Wallet Balance</p>
        <p className="relative mt-2 text-[36px] font-extrabold tracking-tight leading-none tabular-nums">
          {loading ? (
            <span className="inline-block h-9 w-40 rounded-lg bg-white/20 animate-pulse" />
          ) : (
            formatCurrency(totalBalance)
          )}
        </p>
        <p className="relative mt-2 text-sm font-medium text-blue-200">
          Across {walletData.length} wallet{walletData.length !== 1 ? 's' : ''}
          {walletData.filter((w) => w.isBankWallet).length > 0 && (
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px]">
              {walletData.filter((w) => w.isBankWallet).length} bank
            </span>
          )}
        </p>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">
            Balance per Wallet
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="goalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid-stroke, #E2E8F0)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} tickFormatter={(v: number) => formatCurrency(v)} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', backgroundColor: 'var(--tooltip-bg, #fff)', color: 'var(--tooltip-text, #334155)' }}
              />
              <Area type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2.5} fill="url(#goalGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Wallet cards */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="relative overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" /></div>
                <div className="space-y-1.5">
                  <div className="relative h-3 w-24 overflow-hidden rounded bg-slate-100 dark:bg-slate-800"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" /></div>
                  <div className="h-2.5 w-10 rounded bg-slate-50 dark:bg-slate-800/60" />
                </div>
              </div>
              <div className="relative mt-4 h-6 w-28 overflow-hidden rounded bg-slate-100 dark:bg-slate-800"><div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" /></div>
              <div className="mt-2 h-2.5 w-32 rounded bg-slate-50 dark:bg-slate-800/60" />
            </div>
          ))}
        </div>
      ) : walletData.length === 0 ? (
        <div className="flex h-44 flex-col items-center justify-center gap-3 rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
            <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-500">No wallets yet</p>
          <p className="text-xs text-slate-400">Create your first wallet or connect a bank account</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {walletData.map((w) => (
            <div
              key={w.id}
              className="group rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.10)] hover:-translate-y-0.5 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold shadow-sm ring-1 transition-transform duration-300 group-hover:scale-105 ${
                  w.isBankWallet
                    ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/60 text-emerald-600 ring-emerald-100/80 dark:from-emerald-950/50 dark:to-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-900/50'
                    : 'bg-gradient-to-br from-blue-50 to-blue-100/60 text-blue-500 ring-blue-100/80 dark:from-blue-950/50 dark:to-blue-900/30 dark:text-blue-400 dark:ring-blue-900/50'
                }`}>
                  {w.isBankWallet ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                  ) : (
                    w.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                    {w.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <p className="text-xs text-slate-400">{w.currency}</p>
                    {w.isBankWallet && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                        Bank
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-[22px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
                {formatCurrency(w.balance)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {w.isBankWallet ? 'Last synced balance' : 'Created'}{' '}
                {new Date(w.createdAt).toLocaleDateString('en-NG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
