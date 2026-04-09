import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { cn, maskAmount, formatDate } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { computeRunningBalance } from '../utils/ledgerUtils';
import { updateTransactionDescription, deleteTransaction } from '../services/personalFinanceApi';
import EditTransactionSheet from './EditTransactionSheet';
import type { PersonalTransactionDto } from '../types/financeTypes';

interface Props {
  transactions: PersonalTransactionDto[];
  openingBalance: number;
  loading: boolean;
  onDescriptionUpdated?: () => void;
}

function RowMenu({
  tx,
  onRefresh,
}: {
  tx: PersonalTransactionDto;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [descValue, setDescValue] = useState(tx.description ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editTx, setEditTx] = useState<PersonalTransactionDto | null>(null);

  const isManual = tx.source?.toLowerCase() === 'manual' || tx.source === '1';
  const isTransfer = tx.type?.toLowerCase() === 'transfer';

  function handleOpenChange(o: boolean) {
    if (o) setDescValue(tx.description ?? '');
    setOpen(o);
  }

  async function handleSaveDescription() {
    setSaving(true);
    try {
      await updateTransactionDescription(tx.id, descValue.trim() || null);
      toast.success('Description updated');
      onRefresh();
      setOpen(false);
    } catch {
      toast.error('Failed to update description');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTransaction(tx.id);
      toast.success('Transaction deleted');
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete transaction';
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-0.5 rounded hover:bg-muted"
            aria-label="Transaction actions"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" side="left" align="center">
          <div className="space-y-3">
            {/* Description edit — always available */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Edit description</p>
              <Input
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDescription(); }}
                placeholder="Optional note"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveDescription} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>

            {/* Edit / Delete — Manual only */}
            {isManual && (
              <div className="border-t pt-2 flex flex-col gap-1">
                {!isTransfer && (
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted w-full text-left"
                    onClick={() => { setOpen(false); setEditTx(tx); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit transaction
                  </button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-destructive/10 text-destructive w-full text-left"
                      disabled={deleting}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deleting ? 'Deleting…' : 'Delete transaction'}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove the transaction and reverse any budget tracking. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => { setOpen(false); handleDelete(); }}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <EditTransactionSheet
        transaction={editTx}
        onClose={() => setEditTx(null)}
        onSaved={() => { setEditTx(null); onRefresh(); }}
      />
    </>
  );
}

function SourceBadge({ source }: { source: string }) {
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
  return null;
}

export default function WalletLedgerTable({ transactions, openingBalance, loading, onDescriptionUpdated }: Props) {
  const isMobile = useIsMobile();
  const { isPrivate } = usePrivacy();
  const rows = computeRunningBalance(transactions, openingBalance);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-2">
        {rows.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {rows.length} transaction{rows.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {openingBalance !== 0 && (
          <div className="rounded-xl border bg-muted/40 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Opening Balance
                </span>
              </div>
              <span className="text-sm font-bold tabular-nums">{maskAmount(openingBalance, isPrivate)}</span>
            </div>
          </div>
        )}
        {rows.length === 0 ? (
          <div className="flex h-28 items-center justify-center rounded-xl border bg-card">
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          rows.map((tx) => {
            const t = tx.type.toLowerCase();
            const isIncome = t === 'income';
            const isExpense = t === 'expense' || t === 'investment';
            return (
              <div key={tx.id} className="group rounded-xl border bg-card px-4 py-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium truncate">
                        {tx.description || tx.category}
                      </span>
                      <SourceBadge source={tx.source} />
                      {onDescriptionUpdated && (
                        <RowMenu tx={tx} onRefresh={onDescriptionUpdated} />
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{formatDate(tx.date)}</span>
                      {tx.category && tx.category !== '—' && (
                        <>
                          <span>·</span>
                          <span>{tx.category}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {isIncome && (
                      <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{maskAmount(tx.amount, isPrivate)}
                      </div>
                    )}
                    {isExpense && (
                      <div className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                        −{maskAmount(tx.amount, isPrivate)}
                      </div>
                    )}
                    {!isIncome && !isExpense && (
                      <div className="text-sm font-medium tabular-nums text-blue-600 dark:text-blue-400">
                        {maskAmount(tx.amount, isPrivate)}
                      </div>
                    )}
                    <div
                      className={cn(
                        'text-[11px] tabular-nums font-semibold mt-0.5',
                        tx.runningBalance < 0 ? 'text-rose-500' : 'text-muted-foreground'
                      )}
                    >
                      {maskAmount(tx.runningBalance, isPrivate)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  // Desktop: table view
  return (
    <div className="space-y-2">
      {rows.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {rows.length} transaction{rows.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 text-left w-28">Date</th>
            <th className="px-4 py-3 text-left">Description / Category</th>
            <th className="px-4 py-3 text-right w-36">Income</th>
            <th className="px-4 py-3 text-right w-36">Expense</th>
            <th className="px-4 py-3 text-right w-36">Balance</th>
          </tr>
        </thead>
        <tbody>
          {openingBalance !== 0 && (
            <tr className="border-b bg-muted/20">
              <td className="px-4 py-3 text-xs text-muted-foreground">—</td>
              <td className="px-4 py-3 font-medium text-muted-foreground italic text-xs">Opening Balance</td>
              <td className="px-4 py-3 text-right" />
              <td className="px-4 py-3 text-right" />
              <td className="px-4 py-3 text-right font-bold tabular-nums">
                {maskAmount(openingBalance, isPrivate)}
              </td>
            </tr>
          )}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                No transactions yet
              </td>
            </tr>
          )}
          {rows.map((tx) => {
            const t = tx.type.toLowerCase();
            const isIncome = t === 'income';
            const isExpense = t === 'expense' || t === 'investment';
            return (
              <tr key={tx.id} className="group border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(tx.date)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium">
                      {tx.description || tx.category}
                    </span>
                    <SourceBadge source={tx.source} />
                    {tx.sourceBankLabel && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {tx.sourceBankLabel}
                      </Badge>
                    )}
                    {onDescriptionUpdated && (
                      <RowMenu tx={tx} onRefresh={onDescriptionUpdated} />
                    )}
                  </div>
                  {tx.description && tx.category && tx.category !== '—' && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{tx.category}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                  {isIncome ? maskAmount(tx.amount, isPrivate) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                  {isExpense ? maskAmount(tx.amount, isPrivate) : (t === 'transfer' ? maskAmount(tx.amount, isPrivate) : '—')}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 text-right tabular-nums font-bold',
                    tx.runningBalance < 0 ? 'text-rose-600 dark:text-rose-400' : ''
                  )}
                >
                  {maskAmount(tx.runningBalance, isPrivate)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
}
