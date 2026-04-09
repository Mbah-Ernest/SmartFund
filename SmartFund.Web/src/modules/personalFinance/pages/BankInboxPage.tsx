import { useCallback, useEffect, useState } from 'react';
import {
  getBankInbox,
  categorizeInboxItem,
  excludeInboxItem,
  bulkCategorize,
  unpairTransfer,
  type BankInboxItemDto,
} from '../services/personalFinanceApi';
import { getCategories, getWallets } from '../services/personalFinanceApi';
import type { PersonalCategoryDto, PersonalWalletDto } from '../types/financeTypes';
import { PERSONAL_CATEGORY_TYPE } from '../types/financeTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;
const TX_TYPES = ['Expense', 'Income', 'Transfer', 'InvestmentContribution'];

interface RowForm {
  walletId: number | '';
  categoryId: number | '';
  transactionType: string;
  description: string;
  createRule: boolean;
  ruleMatchText: string;
}

function defaultForm(item: BankInboxItemDto, wallets: PersonalWalletDto[]): RowForm {
  const isCredit = item.direction === 'credit';
  return {
    walletId: wallets[0]?.id ?? '',
    categoryId: '',
    transactionType: isCredit ? 'Income' : 'Expense',
    description: '',
    createRule: !isCredit,
    ruleMatchText:
      item.extractedMerchant ??
      item.normalizedNarration?.split(' ').slice(0, 2).join(' ') ??
      '',
  };
}

function formatNaira(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function extractErrorMessage(err: unknown): string {
  if (err != null && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message);
  }
  return 'An unexpected error occurred.';
}

export default function BankInboxPage() {
  const [items, setItems] = useState<BankInboxItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<PersonalCategoryDto[]>([]);
  const [wallets, setWallets] = useState<PersonalWalletDto[]>([]);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [forms, setForms] = useState<Record<number, RowForm>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [postingId, setPostingId] = useState<number | null>(null);
  const [excludingId, setExcludingId] = useState<number | null>(null);
  const [unpairingId, setUnpairingId] = useState<number | null>(null);
  const [bulkPosting, setBulkPosting] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<number | ''>('');
  const [bulkWalletId, setBulkWalletId] = useState<number | ''>('');
  const [bulkType, setBulkType] = useState('Expense');

  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const result = await getBankInbox(p, PAGE_SIZE);
      setItems(result.items);
      setTotal(result.totalCount);
      setPage(p);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      getCategories().then(setCategories),
      getWallets().then(wals => {
        setWallets(wals);
        setBulkWalletId(wals[0]?.id ?? '');
      }),
      loadPage(1),
    ]).catch(err => setError(extractErrorMessage(err)));
  }, [loadPage]);

  function toggleExpand(item: BankInboxItemDto) {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    if (!forms[item.id]) {
      setForms(prev => ({ ...prev, [item.id]: defaultForm(item, wallets) }));
    }
  }

  function updateForm(id: number, patch: Partial<RowForm>) {
    setForms(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handlePost(item: BankInboxItemDto) {
    const form = forms[item.id];
    if (!form || form.walletId === '' || form.categoryId === '') {
      setError('Please select a wallet and category before posting.');
      return;
    }
    setPostingId(item.id);
    setError(null);
    try {
      await categorizeInboxItem(item.id, {
        walletId: form.walletId as number,
        categoryId: form.categoryId as number,
        transactionType: form.transactionType,
        description: form.description || null,
        createRule: form.createRule,
        ruleMatchText: form.createRule ? form.ruleMatchText || null : null,
      });
      removeItem(item.id);
      toast.success('Transaction categorized.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setPostingId(null);
    }
  }

  async function handleExclude(item: BankInboxItemDto) {
    setExcludingId(item.id);
    setError(null);
    try {
      await excludeInboxItem(item.id);
      removeItem(item.id);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setExcludingId(null);
    }
  }

  async function handleUnpair(item: BankInboxItemDto) {
    setUnpairingId(item.id);
    setError(null);
    try {
      await unpairTransfer(item.id);
      await loadPage(page);
      toast.success('Transfer unlinked. Both transactions returned to inbox.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setUnpairingId(null);
    }
  }

  function removeItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    setTotal(prev => Math.max(0, prev - 1));
    if (expandedId === id) setExpandedId(null);
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const reviewableItems = items.filter(i => i.status !== 'PairedTransfer');

  function toggleAll() {
    if (selectedIds.size === reviewableItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(reviewableItems.map(i => i.id)));
  }

  async function handleBulkCategorize() {
    if (!bulkCategoryId || !bulkWalletId) {
      setError('Select a wallet and category for bulk categorize.');
      return;
    }
    setBulkPosting(true);
    setError(null);
    try {
      const { posted } = await bulkCategorize({
        importIds: Array.from(selectedIds),
        walletId: bulkWalletId as number,
        categoryId: bulkCategoryId as number,
        transactionType: bulkType,
      });
      const postedIds = new Set(selectedIds);
      setItems(prev => prev.filter(i => !postedIds.has(i.id)));
      setTotal(prev => Math.max(0, prev - posted));
      setSelectedIds(new Set());
      toast.success(`${posted} transaction${posted !== 1 ? 's' : ''} categorized.`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBulkPosting(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasBulkSelection = selectedIds.size > 0;
  const allSelected = reviewableItems.length > 0 && selectedIds.size === reviewableItems.length;

  function getCategoriesForDirection(direction: 'credit' | 'debit') {
    const preferredType = direction === 'credit' ? PERSONAL_CATEGORY_TYPE.Income : PERSONAL_CATEGORY_TYPE.Expense;
    return [
      ...categories.filter(c => c.type === preferredType),
      ...categories.filter(c => c.type !== preferredType),
    ];
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Inbox</h1>
          <p className="text-muted-foreground text-sm">
            {loading
              ? 'Loading…'
              : total > 0
              ? `${total} transaction${total !== 1 ? 's' : ''} need${total === 1 ? 's' : ''} review`
              : 'All caught up!'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadPage(page)}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-2">
            {error}
            <button type="button" onClick={() => setError(null)} className="shrink-0">
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Bulk actions bar */}
      {hasBulkSelection && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3">
          <span className="text-sm font-bold text-primary">
            {selectedIds.size} selected
          </span>
          <select
            value={bulkWalletId}
            onChange={e => setBulkWalletId(Number(e.target.value) || '')}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Wallet…</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select
            value={bulkCategoryId}
            onChange={e => setBulkCategoryId(Number(e.target.value) || '')}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Category…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={bulkType}
            onChange={e => setBulkType(e.target.value)}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          >
            {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button
            type="button"
            size="sm"
            onClick={handleBulkCategorize}
            disabled={bulkPosting || !bulkCategoryId || !bulkWalletId}
          >
            {bulkPosting ? 'Posting…' : 'Apply to Selected'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs"
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Main list */}
      <Card className="rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {!loading && items.length > 0 && (
            <div className="flex items-center gap-4 border-b px-6 py-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
              <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Narration</span>
              <span className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</span>
              <span className="w-28 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</span>
              <span className="w-28 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Action</span>
            </div>
          )}

          {loading ? (
            <div className="divide-y">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">All caught up!</p>
                <p className="mt-1 text-xs text-muted-foreground">No transactions need review right now.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {items.map(item => {
                const isPaired = item.status === 'PairedTransfer';
                const isExpanded = expandedId === item.id;
                const form = forms[item.id];
                const isPosting = postingId === item.id;
                const isExcluding = excludingId === item.id;
                const isUnpairing = unpairingId === item.id;
                const isCredit = item.direction === 'credit';
                const sortedCats = getCategoriesForDirection(item.direction);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'transition-colors',
                      isPaired ? 'bg-violet-50/40 dark:bg-violet-950/10'
                      : isExpanded ? 'bg-primary/5'
                      : 'hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center gap-4 px-6 py-4">
                      {isPaired ? (
                        <div className="h-4 w-4" />
                      ) : (
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          onClick={e => e.stopPropagation()}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => !isPaired && toggleExpand(item)}
                        className="min-w-0 flex-1 text-left"
                        disabled={isPaired}
                      >
                        <div className="flex items-center gap-2">
                          <p className={cn('truncate text-sm font-semibold', isPaired && 'text-muted-foreground')}>
                            {item.normalizedNarration ?? item.rawNarration}
                          </p>
                          {isPaired && (
                            <Badge className="shrink-0 bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400 text-[10px]">
                              Transfer
                            </Badge>
                          )}
                        </div>
                        {item.normalizedNarration && item.normalizedNarration !== item.rawNarration && (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.rawNarration}</p>
                        )}
                      </button>

                      <div className="w-32 text-right">
                        <p className={cn(
                          'text-sm font-bold tabular-nums',
                          isPaired ? 'text-muted-foreground'
                          : isCredit ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                        )}>
                          {isCredit ? '+' : '−'}{formatNaira(item.amountNaira)}
                        </p>
                        <span className={cn(
                          'inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                          isPaired ? 'bg-muted text-muted-foreground'
                          : isCredit ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
                        )}>
                          {item.direction}
                        </span>
                      </div>

                      <div className="w-28">
                        <p className="text-xs text-muted-foreground">{formatDate(item.transactionDateUtc)}</p>
                      </div>

                      <div className="flex w-28 justify-end">
                        {isPaired ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnpair(item)}
                            disabled={isUnpairing}
                            className="h-7 text-xs border-violet-200 text-violet-600 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400"
                          >
                            {isUnpairing ? 'Unlinking…' : 'Unlink'}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant={isExpanded ? 'default' : 'outline'}
                            onClick={() => toggleExpand(item)}
                            className="h-7 text-xs"
                          >
                            {isExpanded ? 'Collapse' : 'Categorize'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && !isPaired && (
                      <div className="border-t bg-primary/5 px-6 py-5">
                        <div className="flex flex-wrap items-end gap-3">
                          <label className="block">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Wallet</span>
                            <select
                              value={form?.walletId ?? ''}
                              onChange={e => updateForm(item.id, { walletId: Number(e.target.value) || '' })}
                              className="mt-1 block rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
                            >
                              <option value="">Select wallet…</option>
                              {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
                            <select
                              value={form?.categoryId ?? ''}
                              onChange={e => updateForm(item.id, { categoryId: Number(e.target.value) || '' })}
                              className="mt-1 block rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
                            >
                              <option value="">Select category…</option>
                              {sortedCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</span>
                            <select
                              value={form?.transactionType ?? 'Expense'}
                              onChange={e => updateForm(item.id, { transactionType: e.target.value })}
                              className="mt-1 block rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
                            >
                              {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </label>

                          <label className="block min-w-[180px] flex-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Description <span className="normal-case font-normal">(optional)</span>
                            </span>
                            <Input
                              type="text"
                              value={form?.description ?? ''}
                              onChange={e => updateForm(item.id, { description: e.target.value })}
                              placeholder={item.normalizedNarration ?? item.rawNarration}
                              className="mt-1"
                            />
                          </label>

                          <div className="flex shrink-0 items-center gap-2 pb-[1px]">
                            <Button
                              type="button"
                              onClick={() => handlePost(item)}
                              disabled={isPosting || !form || form.walletId === '' || form.categoryId === ''}
                            >
                              {isPosting ? 'Posting…' : 'Post'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleExclude(item)}
                              disabled={isExcluding}
                              className="hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive"
                            >
                              Exclude
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <label className="flex cursor-pointer items-center gap-2">
                            <Checkbox
                              checked={form?.createRule ?? false}
                              onCheckedChange={checked => updateForm(item.id, { createRule: !!checked })}
                            />
                            <span className="text-xs font-semibold">
                              Remember — auto-categorize future matches
                            </span>
                          </label>
                          {form?.createRule && (
                            <>
                              <Input
                                type="text"
                                value={form.ruleMatchText}
                                onChange={e => updateForm(item.id, { ruleMatchText: e.target.value })}
                                placeholder="Match text…"
                                className="h-8 w-auto text-xs"
                              />
                              <span className="text-[11px] text-muted-foreground">
                                Transactions containing this text will auto-post
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPage(page - 1)}
            disabled={page <= 1 || loading}
          >
            ← Prev
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPage(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
