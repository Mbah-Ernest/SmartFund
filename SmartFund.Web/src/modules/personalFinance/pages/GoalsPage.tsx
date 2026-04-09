import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CARD_GRADIENTS = [
  'from-violet-600 to-violet-400',
  'from-emerald-600 to-emerald-400',
  'from-rose-600 to-rose-400',
  'from-blue-600 to-blue-400',
  'from-amber-600 to-amber-400',
];
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
  getConnectedAccounts,
  deleteWallet
} from '../services/personalFinanceApi';
import type { ConnectedBankAccountDto } from '../services/personalFinanceApi';
import type { PersonalWalletDto, WalletBalanceDto } from '../types/financeTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Plus, X, Landmark } from 'lucide-react';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(n);
}

type WalletWithBalance = PersonalWalletDto & { balance: number; isBankWallet: boolean };

export default function GoalsPage() {
  const carouselRef = useRef<HTMLDivElement>(null);
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

  async function handleDeleteWallet(wallet: WalletWithBalance) {
    const confirmed = window.confirm(
      `Delete wallet "${wallet.name}"? This will permanently remove the wallet and all its transactions from the system.`
    );
    if (!confirmed) return;

    const pin = window.prompt('Enter your PIN to confirm wallet deletion.');
    if (!pin) return;

    setError(null);
    try {
      await deleteWallet(wallet.id, pin);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete wallet.');
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground text-sm">
            Manage your wallets and balances.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'outline' : 'default'} className="gap-2">
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> New Wallet</>}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm">New Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Wallet Name</span>
                  <Input
                    type="text"
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    placeholder="e.g. Emergency Fund"
                    className="mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Currency</span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    <option value="NGN">NGN — Nigerian Naira</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                  </select>
                </label>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Wallet'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Total balance highlight */}
      <div className="relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-4 text-primary-foreground shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-xl" />
        <p className="relative text-sm font-semibold text-primary-foreground/80">Combined Wallet Balance</p>
        <p className="relative mt-1 text-3xl font-extrabold tracking-tight leading-none tabular-nums">
          {loading ? (
            <span className="inline-block h-9 w-40 rounded-lg bg-white/20 animate-pulse" />
          ) : (
            formatCurrency(totalBalance)
          )}
        </p>
        <p className="relative mt-2 text-sm font-medium text-primary-foreground/70">
          Across {walletData.length} wallet{walletData.length !== 1 ? 's' : ''}
          {walletData.filter((w) => w.isBankWallet).length > 0 && (
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px]">
              {walletData.filter((w) => w.isBankWallet).length} bank
            </span>
          )}
        </p>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm">Balance per Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
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
          </CardContent>
        </Card>
      )}

      {/* Wallet cards carousel */}
      {loading ? (
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-[min(280px,80vw)] shrink-0 rounded-2xl" />
          ))}
        </div>
      ) : walletData.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex h-44 flex-col items-center justify-center gap-3">
            <p className="text-sm font-medium text-muted-foreground">No wallets yet</p>
            <p className="text-xs text-muted-foreground">Create your first wallet or connect a bank account</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <div
            ref={carouselRef}
            className="flex gap-3 overflow-x-auto scroll-smooth pb-3 scrollbar-hide [scroll-snap-type:x_mandatory]"
          >
            {walletData.map((w, idx) => {
              const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
              const idStr = String(w.id).slice(-4).padStart(4, '0');
              return (
                <div
                  key={w.id}
                  className={`shrink-0 w-[min(280px,80vw)] [scroll-snap-align:start] relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-4 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
                  style={{ aspectRatio: '1.6 / 1' }}
                >
                  {/* Decorative circles */}
                  <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
                  <div className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/5" />

                  {/* Top row: name + bank badge */}
                  <div className="relative flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-white/80 truncate">{w.name}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {w.isBankWallet && (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Bank
                        </span>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteWallet(w)}
                        className="h-6 px-1.5 text-[10px] text-white/70 hover:bg-white/20 hover:text-white"
                      >
                        ×
                      </Button>
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="relative mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Balance</p>
                    <p className="mt-0.5 text-2xl font-bold text-white tabular-nums leading-none">
                      {formatCurrency(w.balance)}
                    </p>
                  </div>

                  {/* Bottom row */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <p className="text-[10px] text-white/50">
                      {w.currency}
                    </p>
                    <p className="text-[11px] font-mono text-white/50">
                      •••• {idStr}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {walletData.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => carouselRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow-md border border-border backdrop-blur"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => carouselRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow-md border border-border backdrop-blur"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          <div className="flex justify-center gap-1.5 mt-2">
            {walletData.map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
