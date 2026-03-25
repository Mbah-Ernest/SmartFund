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
    createRule: !isCredit, // auto-remember debits, not credits
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

/* ══════════════════════════════════════════════════════════════════════════ */
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /* ── Data loading ────────────────────────────────────────────────────── */
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

  /* ── Row expand/collapse ─────────────────────────────────────────────── */
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

  /* ── Post single ─────────────────────────────────────────────────────── */
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
      setSuccessMsg('Transaction categorized.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setPostingId(null);
    }
  }

  /* ── Exclude single ──────────────────────────────────────────────────── */
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

  /* ── Unlink transfer pair ────────────────────────────────────────────── */
  async function handleUnpair(item: BankInboxItemDto) {
    setUnpairingId(item.id);
    setError(null);
    try {
      await unpairTransfer(item.id);
      // Reload page — both sides return to NeedsReview and need to be re-fetched
      await loadPage(page);
      setSuccessMsg('Transfer unlinked. Both transactions returned to inbox.');
      setTimeout(() => setSuccessMsg(null), 4000);
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

  /* ── Bulk select ─────────────────────────────────────────────────────── */
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

  /* ── Bulk categorize ─────────────────────────────────────────────────── */
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
      setSuccessMsg(`${posted} transaction${posted !== 1 ? 's' : ''} categorized.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBulkPosting(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasBulkSelection = selectedIds.size > 0;
  const allSelected = reviewableItems.length > 0 && selectedIds.size === reviewableItems.length;

  /* ── Filtered categories for a row ──────────────────────────────────── */
  function getCategoriesForDirection(direction: 'credit' | 'debit') {
    // Show income-type categories first for credits, expense-type first for debits
    const preferredType = direction === 'credit' ? PERSONAL_CATEGORY_TYPE.Income : PERSONAL_CATEGORY_TYPE.Expense;
    return [
      ...categories.filter(c => c.type === preferredType),
      ...categories.filter(c => c.type !== preferredType),
    ];
  }

  /* ──────────────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Bank Inbox
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {loading
              ? 'Loading…'
              : total > 0
              ? `${total} transaction${total !== 1 ? 's' : ''} need${total === 1 ? 's' : ''} review`
              : 'All caught up!'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadPage(page)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Success / error banners */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/60 px-5 py-3 dark:border-emerald-800/50">
          <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{successMsg}</p>
          <button type="button" onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-50/60 px-5 py-4 dark:border-rose-900/50">
          <ExclamationIcon className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Error</p>
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
          <button type="button" onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bulk actions bar */}
      {hasBulkSelection && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
          <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
            {selectedIds.size} selected
          </span>
          <select
            value={bulkWalletId}
            onChange={e => setBulkWalletId(Number(e.target.value) || '')}
            className="rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Wallet…</option>
            {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select
            value={bulkCategoryId}
            onChange={e => setBulkCategoryId(Number(e.target.value) || '')}
            className="rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Category…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={bulkType}
            onChange={e => setBulkType(e.target.value)}
            className="rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            type="button"
            onClick={handleBulkCategorize}
            disabled={bulkPosting || !bulkCategoryId || !bulkWalletId}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {bulkPosting ? 'Posting…' : 'Apply to Selected'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-blue-500 hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Main list */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">

        {/* Table header */}
        {!loading && items.length > 0 && (
          <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-3 dark:border-slate-800">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300 accent-blue-500"
              aria-label="Select all"
            />
            <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Narration</span>
            <span className="w-32 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Amount</span>
            <span className="w-28 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Date</span>
            <span className="w-28 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Action</span>
          </div>
        )}

        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="h-4 w-4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40">
              <CheckCircleIcon className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">All caught up!</p>
              <p className="mt-1 text-xs text-slate-400">No transactions need review right now.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
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
                  className={`transition-colors ${
                    isPaired
                      ? 'bg-violet-50/40 dark:bg-violet-950/10'
                      : isExpanded
                      ? 'bg-blue-50/60 dark:bg-blue-950/20'
                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {/* Row summary line */}
                  <div className="flex items-center gap-4 px-6 py-4">
                    {isPaired ? (
                      <div className="h-4 w-4" /> /* spacer — no checkbox for paired */
                    ) : (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        onClick={e => e.stopPropagation()}
                        className="h-4 w-4 rounded border-slate-300 accent-blue-500"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => !isPaired && toggleExpand(item)}
                      className="min-w-0 flex-1 text-left"
                      disabled={isPaired}
                    >
                      <div className="flex items-center gap-2">
                        <p className={`truncate text-sm font-semibold ${isPaired ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                          {item.normalizedNarration ?? item.rawNarration}
                        </p>
                        {isPaired && (
                          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
                            Transfer
                          </span>
                        )}
                      </div>
                      {item.normalizedNarration && item.normalizedNarration !== item.rawNarration && (
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">{item.rawNarration}</p>
                      )}
                    </button>

                    <div className="w-32 text-right">
                      <p className={`text-sm font-bold tabular-nums ${
                        isPaired
                          ? 'text-slate-400 dark:text-slate-500'
                          : isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'
                      }`}>
                        {isCredit ? '+' : '−'}{formatNaira(item.amountNaira)}
                      </p>
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        isPaired
                          ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                          : isCredit
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'
                      }`}>
                        {item.direction}
                      </span>
                    </div>

                    <div className="w-28">
                      <p className="text-xs text-slate-500">{formatDate(item.transactionDateUtc)}</p>
                    </div>

                    <div className="flex w-28 justify-end">
                      {isPaired ? (
                        <button
                          type="button"
                          onClick={() => handleUnpair(item)}
                          disabled={isUnpairing}
                          title="This was auto-detected as a transfer between your accounts. Click to unlink and categorize manually."
                          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-100 hover:border-violet-300 disabled:opacity-60 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-400"
                        >
                          {isUnpairing ? 'Unlinking…' : 'Unlink'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleExpand(item)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isExpanded
                              ? 'border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-400'
                          }`}
                        >
                          {isExpanded ? 'Collapse' : 'Categorize'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded categorization form — never shown for paired transfers */}
                  {isExpanded && !isPaired && (
                    <div className="border-t border-blue-100 bg-blue-50/80 px-6 py-5 dark:border-blue-900/40 dark:bg-blue-950/20">
                      <div className="flex flex-wrap items-end gap-3">

                        {/* Wallet */}
                        <label className="block">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Wallet
                          </span>
                          <select
                            value={form?.walletId ?? ''}
                            onChange={e => updateForm(item.id, { walletId: Number(e.target.value) || '' })}
                            className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900"
                          >
                            <option value="">Select wallet…</option>
                            {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                          </select>
                        </label>

                        {/* Category — sorted by direction */}
                        <label className="block">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Category
                          </span>
                          <select
                            value={form?.categoryId ?? ''}
                            onChange={e => updateForm(item.id, { categoryId: Number(e.target.value) || '' })}
                            className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900"
                          >
                            <option value="">Select category…</option>
                            {sortedCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </label>

                        {/* Type */}
                        <label className="block">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Type
                          </span>
                          <select
                            value={form?.transactionType ?? 'Expense'}
                            onChange={e => updateForm(item.id, { transactionType: e.target.value })}
                            className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900"
                          >
                            {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </label>

                        {/* Description (optional) */}
                        <label className="block min-w-[180px] flex-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Description <span className="normal-case font-normal">(optional)</span>
                          </span>
                          <input
                            type="text"
                            value={form?.description ?? ''}
                            onChange={e => updateForm(item.id, { description: e.target.value })}
                            placeholder={item.normalizedNarration ?? item.rawNarration}
                            className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900"
                          />
                        </label>

                        {/* Action buttons */}
                        <div className="flex shrink-0 items-center gap-2 pb-[1px]">
                          <button
                            type="button"
                            onClick={() => handlePost(item)}
                            disabled={isPosting || !form || form.walletId === '' || form.categoryId === ''}
                            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-60"
                          >
                            {isPosting ? 'Posting…' : 'Post'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExclude(item)}
                            disabled={isExcluding}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
                          >
                            Exclude
                          </button>
                        </div>
                      </div>

                      {/* Remember rule row */}
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form?.createRule ?? false}
                            onChange={e => updateForm(item.id, { createRule: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 accent-blue-500"
                          />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Remember — auto-categorize future matches
                          </span>
                        </label>
                        {form?.createRule && (
                          <>
                            <input
                              type="text"
                              value={form.ruleMatchText}
                              onChange={e => updateForm(item.id, { ruleMatchText: e.target.value })}
                              placeholder="Match text…"
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-900"
                            />
                            <span className="text-[11px] text-slate-400">
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => loadPage(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button
            type="button"
            onClick={() => loadPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────────── */
function RefreshIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 9a8 8 0 0114.93-2M20 15a8 8 0 01-14.93 2" />
    </svg>
  );
}

function CheckCircleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
  );
}

function ExclamationIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

function XIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
