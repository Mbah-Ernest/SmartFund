import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  getTransactions,
  getCategories,
  getWallets,
  getWalletBalance,
} from '../services/personalFinanceApi';
import { getTranches } from '../../../api/tranchesApi';
import type { PersonalTransactionDto, PersonalCategoryDto, PersonalWalletDto } from '../types/financeTypes';
import { PERSONAL_CATEGORY_TYPE } from '../types/financeTypes';
import type { TrancheDto } from '../../../types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { cn, maskAmount, formatDate } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { computeRunningBalance } from '../utils/ledgerUtils';
import QuickEntrySheet from '../components/QuickEntrySheet';
import OpeningBalancePrompt from '../components/OpeningBalancePrompt';
import WalletLedgerTable from '../components/WalletLedgerTable';
import ReconcileSheet from '../components/ReconcileSheet';
import BulkReconcileSheet from '../components/BulkReconcileSheet';

// ── All-tab helpers ───────────────────────────────────────────────────────────

type SortField = 'newest' | 'oldest' | 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'newest', label: 'Newest first (input time)' },
  { value: 'oldest', label: 'Oldest first (input time)' },
  { value: 'date-desc', label: 'Transaction date ↓' },
  { value: 'date-asc', label: 'Transaction date ↑' },
  { value: 'amount-desc', label: 'Amount ↓ (highest)' },
  { value: 'amount-asc', label: 'Amount ↑ (lowest)' },
];

function typeBadgeVariant(type: string) {
  const t = type.toLowerCase();
  if (t === 'income') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400';
  if (t === 'expense') return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400';
  if (t === 'transfer') return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';
}

function SourceBadgeAll({ source }: { source: string }) {
  const s = source?.toLowerCase();
  if (s === 'banksync' || s === 'bank_sync' || s === '2') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
        Bank
      </span>
    );
  }
  if (s === 'reconciliation' || s === '3') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        Adj
      </span>
    );
  }
  // Manual (default)
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-muted text-muted-foreground">
      Manual
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  // Shared data
  const [wallets, setWallets] = useState<PersonalWalletDto[]>([]);
  const [categories, setCategories] = useState<PersonalCategoryDto[]>([]);
  const [tranches, setTranches] = useState<TrancheDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  // All-tab state
  const [allRows, setAllRows] = useState<PersonalTransactionDto[]>([]);
  const [allLoading, setAllLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortField>('newest');
  const [filterType, setFilterType] = useState<string>('all');

  // Per-wallet cache: Map<walletId, { txs, loading }>
  const [walletTxCache, setWalletTxCache] = useState<Map<number, PersonalTransactionDto[]>>(new Map());
  const [walletLoadingSet, setWalletLoadingSet] = useState<Set<number>>(new Set());
  const [walletBalanceMap, setWalletBalanceMap] = useState<Map<number, number>>(new Map());

  // Active tab
  const [activeTab, setActiveTab] = useState<string>('all');

  // Sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetWalletId, setSheetWalletId] = useState<number>(0);

  // Reconcile sheet
  const [reconcileWalletId, setReconcileWalletId] = useState<number | null>(null);

  // Bulk reconcile sheet
  const [bulkReconcileOpen, setBulkReconcileOpen] = useState(false);

  const loadWalletBalances = useCallback(async (walletIds: number[]) => {
    if (walletIds.length === 0) {
      setWalletBalanceMap(new Map());
      return;
    }

    try {
      const balances = await Promise.all(
        walletIds.map(async (walletId) => {
          const row = await getWalletBalance(walletId);
          return [walletId, row.balance] as const;
        })
      );
      setWalletBalanceMap(new Map(balances));
    } catch {
      // Keep previous balances if fetch fails; per-wallet computed fallback still applies.
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────

  const loadSharedData = useCallback(async () => {
    try {
      const [w, cats, t] = await Promise.all([
        getWallets(),
        getCategories(),
        getTranches(),
      ] as const);
      setWallets(w);
      setCategories(cats);
      setTranches(t);
      await loadWalletBalances(w.map((wallet) => wallet.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data.');
    }
  }, [loadWalletBalances]);

  const loadAllTransactions = useCallback(async () => {
    setAllLoading(true);
    try {
      const txs = await getTransactions();
      setAllRows(txs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions.');
    } finally {
      setAllLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSharedData();
    loadAllTransactions();
  }, [loadSharedData, loadAllTransactions]);

  // ── Per-wallet load ───────────────────────────────────────────────────────

  const loadWalletTransactions = useCallback(async (walletId: number, force = false) => {
    if (!force && walletTxCache.has(walletId)) return;
    setWalletLoadingSet((prev) => new Set(prev).add(walletId));
    try {
      const txs = await getTransactions({ walletId });
      setWalletTxCache((prev) => new Map(prev).set(walletId, txs));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet transactions.');
    } finally {
      setWalletLoadingSet((prev) => {
        const next = new Set(prev);
        next.delete(walletId);
        return next;
      });
    }
  }, [walletTxCache]);

  // When switching to a wallet tab, fetch if not cached
  function handleTabChange(value: string) {
    setActiveTab(value);
    if (value !== 'all') {
      const wid = Number(value);
      loadWalletTransactions(wid);
    }
  }

  const { isPrivate } = usePrivacy();

  // ── Active wallet (for sheet) ─────────────────────────────────────────────

  const activeWalletId = activeTab === 'all'
    ? (wallets[0]?.id ?? 0)
    : Number(activeTab);

  function openSheet() {
    setSheetWalletId(activeWalletId);
    setSheetOpen(true);
  }

  function handleSheetSuccess() {
    // Refresh both all-tab and the active wallet tab
    loadAllTransactions();
    loadWalletBalances(wallets.map((w) => w.id));
    if (activeTab !== 'all') {
      loadWalletTransactions(Number(activeTab), true);
    }
  }

  function handleWalletReload() {
    loadSharedData(); // Re-fetch wallets so openingBalance is refreshed
    if (activeTab !== 'all') {
      loadWalletTransactions(Number(activeTab), true);
    }
  }

  // ── Wallet balance helper ─────────────────────────────────────────────────

  function walletCurrentBalance(wallet: PersonalWalletDto): number | null {
    const exactBalance = walletBalanceMap.get(wallet.id);
    if (exactBalance !== undefined) return exactBalance;

    const txs = walletTxCache.get(wallet.id);
    if (!txs) return null;
    const rows = computeRunningBalance(txs, wallet.openingBalance ?? 0);
    return rows.length > 0 ? rows[rows.length - 1].runningBalance : (wallet.openingBalance ?? 0);
  }

  // ── All-tab filtering/sorting ─────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (filterType === 'all') return allRows;
    return allRows.filter((r) => r.type.toLowerCase() === filterType);
  }, [allRows, filterType]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortBy) {
      case 'newest': return list.sort((a, b) => b.id - a.id);
      case 'oldest': return list.sort((a, b) => a.id - b.id);
      case 'date-desc': return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);
      case 'date-asc': return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
      case 'amount-desc': return list.sort((a, b) => b.amount - a.amount || b.id - a.id);
      case 'amount-asc': return list.sort((a, b) => a.amount - b.amount || a.id - b.id);
      default: return list;
    }
  }, [filtered, sortBy]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 pt-0 gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-sm">Your full transaction history</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkReconcileOpen(true)}
            disabled={wallets.length === 0}
            className="h-10 px-4"
          >
            Correct Balances
          </Button>
          <Button onClick={openSheet} className="h-10 gap-2 px-4">
            <Plus className="h-4 w-4" />
            Record Transaction
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto pb-1 scrollbar-hide">
          <TabsList className="h-auto min-w-max gap-1">
          <TabsTrigger value="all">All</TabsTrigger>
          {wallets.map((w) => {
            const bal = walletCurrentBalance(w);
            return (
              <TabsTrigger key={w.id} value={String(w.id)} className="h-9 gap-1.5 px-3">
                {w.name}
                {bal !== null && (
                  <span className={cn(
                    'text-[10px] font-semibold tabular-nums rounded px-1',
                    bal < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                  )}>
                    {maskAmount(bal, isPrivate)}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
          </TabsList>
        </div>

        {/* ── All tab ─────────────────────────────────────────── */}
        <TabsContent value="all" className="mt-4 space-y-3">
          {/* Sort & filter bar */}
          <div className="mb-2 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortField)}>
              <SelectTrigger className="h-10 w-full min-w-[220px] lg:w-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap gap-1.5">
              {['all', 'income', 'expense', 'transfer', 'investment'].map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant={filterType === t ? 'default' : 'outline'}
                  onClick={() => setFilterType(t)}
                  className="h-9 rounded-full px-3.5 text-xs capitalize"
                >
                  {t === 'all' ? 'All' : t}
                </Button>
              ))}
            </div>

            <span className="text-xs tabular-nums text-muted-foreground lg:ml-auto">
              {sorted.length} transaction(s)
            </span>
          </div>
          </div>

          {/* List */}
          <div className="max-h-[65vh] space-y-2 overflow-auto pr-1">
            {allLoading ? (
              <Card className="rounded-xl">
                <CardContent className="flex h-40 items-center justify-center">
                  <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-muted border-t-primary" />
                </CardContent>
              </Card>
            ) : sorted.length === 0 ? (
              <Card className="rounded-xl">
                <CardContent className="flex h-40 items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <p className="text-sm font-medium text-muted-foreground">No transactions found</p>
                    <p className="text-xs text-muted-foreground">Use the + button or the wallet tabs to record one</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              sorted.map((tx) => (
                <div
                  key={tx.id}
                  className={cn(
                    'cursor-pointer rounded-r-xl border bg-card px-4 py-3 shadow-sm transition-colors duration-150 hover:bg-muted/50 sm:px-5 sm:py-4',
                    'flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4',
                    tx.type.toLowerCase() === 'income'
                      ? 'border-l-2 border-l-emerald-400'
                      : tx.type.toLowerCase() === 'expense' || tx.type.toLowerCase() === 'investment'
                        ? 'border-l-2 border-l-rose-400'
                        : 'border-l-2 border-l-blue-400'
                  )}
                >
                  <span className={cn(
                    'inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                    typeBadgeVariant(tx.type)
                  )}>
                    {tx.type}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {tx.description || tx.category}
                      </span>
                      <SourceBadgeAll source={tx.source} />
                      {tx.sourceBankLabel && (
                        <Badge variant="secondary" className="shrink-0 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {tx.sourceBankLabel}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{tx.wallet}</span>
                      {tx.description && tx.category !== '—' && (
                        <>
                          <span>·</span>
                          <span>{tx.category}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{formatDate(tx.date)}</span>
                      <span>·</span>
                      <span className="font-mono">#{tx.id}</span>
                    </div>
                  </div>

                  <span className={cn(
                    'self-end text-sm font-bold tabular-nums sm:shrink-0 sm:self-auto',
                    tx.type.toLowerCase() === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : tx.type.toLowerCase() === 'expense' || tx.type.toLowerCase() === 'investment'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-blue-600 dark:text-blue-400'
                  )}>
                    {tx.type.toLowerCase() === 'income' ? '+' : tx.type.toLowerCase() === 'transfer' ? '' : '−'}
                    {maskAmount(tx.amount, isPrivate)}
                  </span>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* ── Per-wallet tabs ──────────────────────────────────── */}
        {wallets.map((w) => {
          const txs = walletTxCache.get(w.id) ?? [];
          const isLoading = walletLoadingSet.has(w.id);
          const currentBal = walletCurrentBalance(w) ?? (w.openingBalance ?? 0);
          return (
            <TabsContent key={w.id} value={String(w.id)} className="mt-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <OpeningBalancePrompt wallet={w} txCount={txs.length} onSaved={handleWalletReload} />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-8 text-xs"
                  onClick={() => setReconcileWalletId(w.id)}
                >
                  Reconcile
                </Button>
              </div>

              <div className="max-h-[calc(100vh-260px)] overflow-auto pr-1">
                <WalletLedgerTable
                  transactions={txs}
                  openingBalance={w.openingBalance ?? 0}
                  loading={isLoading}
                  onDescriptionUpdated={() => loadWalletTransactions(w.id, true)}
                />
              </div>
              {reconcileWalletId === w.id && (
                <ReconcileSheet
                  wallet={w}
                  currentBalance={currentBal}
                  open={reconcileWalletId === w.id}
                  onOpenChange={(open) => { if (!open) setReconcileWalletId(null); }}
                  onSuccess={() => {
                    loadSharedData();
                    loadWalletTransactions(w.id, true);
                    loadAllTransactions();
                    loadWalletBalances(wallets.map((wallet) => wallet.id));
                  }}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Floating + button — always visible */}
      <button
        type="button"
        onClick={openSheet}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 transition-colors"
        aria-label="Record transaction"
      >
        <Plus className="h-6 w-6" />
      </button>

      <QuickEntrySheet
        walletId={sheetWalletId || activeWalletId}
        wallets={wallets}
        categories={categories}
        tranches={tranches}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={handleSheetSuccess}
      />

      {bulkReconcileOpen && (
        <BulkReconcileSheet
          rows={wallets.map((w) => ({
            wallet: w,
            currentBalance: walletCurrentBalance(w) ?? (w.openingBalance ?? 0),
          }))}
          open={bulkReconcileOpen}
          onOpenChange={setBulkReconcileOpen}
          onSuccess={() => {
            loadSharedData();
            loadAllTransactions();
            wallets.forEach((w) => loadWalletTransactions(w.id, true));
            loadWalletBalances(wallets.map((wallet) => wallet.id));
          }}
        />
      )}
    </div>
  );
}
