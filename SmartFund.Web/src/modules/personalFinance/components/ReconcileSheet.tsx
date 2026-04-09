import { useState } from 'react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatNaira } from '@/lib/utils';
import { reconcileWallet } from '../services/personalFinanceApi';
import type { PersonalWalletDto } from '../types/financeTypes';

interface Props {
  wallet: PersonalWalletDto;
  currentBalance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ReconcileSheet({
  wallet,
  currentBalance,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [actualBalance, setActualBalance] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedActual = actualBalance === '' ? null : parseFloat(actualBalance);
  const diff = parsedActual !== null && !isNaN(parsedActual)
    ? parsedActual - currentBalance
    : null;

  function handleActualBlur() {
    if (actualBalance !== '' && !isNaN(parseFloat(actualBalance))) {
      setActualBalance(parseFloat(actualBalance).toFixed(2));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsedActual === null || isNaN(parsedActual)) {
      setError('Enter a valid actual balance.');
      return;
    }
    if (!date) {
      setError('Select a date.');
      return;
    }
    if (diff === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      await reconcileWallet(wallet.id, {
        actualBalance: parsedActual,
        date,
        note: note.trim() || undefined,
      });
      const diffLabel = diff !== null
        ? (diff > 0 ? `+${formatNaira(diff)}` : formatNaira(diff))
        : '';
      toast(`Reconciliation saved. Adjustment: ${diffLabel}`);
      setActualBalance('');
      setNote('');
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reconcile wallet.');
    } finally {
      setSubmitting(false);
    }
  }

  const isDisabled = diff === null || diff === 0 || parsedActual === null || submitting;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Reconcile — {wallet.name}</SheetTitle>
          <SheetDescription>
            Sync your SmartFund balance with your actual bank balance.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* SmartFund balance read-only row */}
          <div className="rounded-lg border border-input bg-muted px-4 py-3">
            <div className="text-xs text-muted-foreground mb-0.5">SmartFund balance</div>
            <div className="text-base font-bold tabular-nums">{formatNaira(currentBalance)}</div>
          </div>

          {/* Actual bank balance */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Actual bank balance (₦)</label>
            <Input
              type="number"
              step="0.01"
              value={actualBalance}
              onChange={(e) => setActualBalance(e.target.value)}
              onBlur={handleActualBlur}
              placeholder="0.00"
              autoFocus
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">As of date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
            <Input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Monthly reconciliation"
            />
          </div>

          {/* Diff preview */}
          <div className="rounded-lg border px-4 py-3 min-h-[52px] flex items-center">
            {diff === null ? (
              <span className="text-sm text-muted-foreground">Enter actual balance to see adjustment</span>
            ) : diff === 0 ? (
              <span className="text-sm text-muted-foreground">No adjustment needed — balances match</span>
            ) : diff > 0 ? (
              <span className={cn('text-sm font-semibold tabular-nums', 'text-emerald-600 dark:text-emerald-400')}>
                +{formatNaira(diff)} will be added
              </span>
            ) : (
              <span className={cn('text-sm font-semibold tabular-nums', 'text-rose-600 dark:text-rose-400')}>
                {formatNaira(diff)} will be deducted
              </span>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isDisabled} className="w-full">
            {submitting ? 'Reconciling…' : 'Reconcile'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
