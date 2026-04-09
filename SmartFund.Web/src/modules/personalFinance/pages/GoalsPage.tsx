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
      <div className="relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-7 text-primary-foreground shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-white/5 blur-xl" />
        <p className="relative text-sm font-semibold text-primary-foreground/80">Combined Wallet Balance</p>
        <p className="relative mt-2 text-4xl font-extrabold tracking-tight leading-none tabular-nums">
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
          </CardContent>
        </Card>
      )}

      {/* Wallet cards */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2.5 w-10" />
                  </div>
                </div>
                <Skeleton className="mt-4 h-6 w-28" />
                <Skeleton className="mt-2 h-2.5 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : walletData.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="flex h-44 flex-col items-center justify-center gap-3">
            <p className="text-sm font-medium text-muted-foreground">No wallets yet</p>
            <p className="text-xs text-muted-foreground">Create your first wallet or connect a bank account</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {walletData.map((w) => (
            <Card key={w.id} className="rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold shadow-sm ring-1 ${
                    w.isBankWallet
                      ? 'bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-800'
                      : 'bg-primary/10 text-primary ring-primary/20'
                  }`}>
                    {w.isBankWallet ? (
                      <Landmark className="h-5 w-5" />
                    ) : (
                      w.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{w.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <p className="text-xs text-muted-foreground">{w.currency}</p>
                      {w.isBankWallet && (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          Bank
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteWallet(w)}
                      className="h-7 px-2 text-xs"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <p className="mt-4 text-2xl font-extrabold tracking-tight tabular-nums">
                  {formatCurrency(w.balance)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {w.isBankWallet ? 'Last synced balance' : 'Created'}{' '}
                  {new Date(w.createdAt).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
