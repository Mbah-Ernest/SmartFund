import { useState, useMemo } from 'react';
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
import { bulkReconcileWallets } from '../services/personalFinanceApi';
import type { PersonalWalletDto } from '../types/financeTypes';

interface WalletRow {
  wallet: PersonalWalletDto;
  currentBalance: number;
}

interface Props {
  rows: WalletRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function BulkReconcileSheet({ rows, open, onOpenChange, onSuccess }: Props) {
  const [inputs, setInputs] = useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.wallet.id, r.currentBalance.toFixed(2)]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-initialize inputs when rows change (sheet opened fresh)
  // We rely on the parent unmounting/remounting via `key` or open state.

  function handleInput(walletId: number, value: string) {
    setInputs((prev) => ({ ...prev, [walletId]: value }));
  }

  function handleBlur(walletId: number) {
    const raw = inputs[walletId];
    if (raw !== '' && !isNaN(parseFloat(raw))) {
      setInputs((prev) => ({ ...prev, [walletId]: parseFloat(raw).toFixed(2) }));
    }
  }

  const diffs = useMemo(() => {
    return rows.map((r) => {
      const raw = inputs[r.wallet.id];
      const parsed = raw === '' ? null : parseFloat(raw);
      const diff = parsed !== null && !isNaN(parsed) ? parsed - r.currentBalance : null;
      return { walletId: r.wallet.id, parsed, diff };
    });
  }, [rows, inputs]);

  const adjustCount = diffs.filter((d) => d.diff !== null && d.diff !== 0).length;
  const matchCount = diffs.filter((d) => d.diff !== null && d.diff === 0).length;
  const hasInvalid = diffs.some((d) => d.parsed === null || isNaN(d.parsed ?? NaN));
  const isDisabled = submitting || adjustCount === 0 || hasInvalid;

  async function handleApply() {
    setError(null);
    setSubmitting(true);
    try {
      const entries = diffs
        .filter((d) => d.diff !== null && d.diff !== 0 && d.parsed !== null)
        .map((d) => ({ walletId: d.walletId, actualBalance: d.parsed! }));

      const result = await bulkReconcileWallets(entries);

      const count = result.adjusted.length;
      toast(count === 1 ? '1 wallet balance corrected' : `${count} wallet balances corrected`);
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to apply corrections.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Correct Balances</SheetTitle>
          <SheetDescription>
            Enter the actual balance for each wallet. Only wallets with a difference will be adjusted.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_130px_130px_100px] gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">Wallet</span>
            <span className="text-xs font-medium text-muted-foreground text-right">System Balance</span>
            <span className="text-xs font-medium text-muted-foreground text-right">Actual Balance</span>
            <span className="text-xs font-medium text-muted-foreground text-right">Difference</span>
          </div>

          <div className="divide-y divide-border rounded-lg border">
            {rows.map((r, i) => {
              const { diff } = diffs[i];
              return (
                <div
                  key={r.wallet.id}
                  className="grid grid-cols-[1fr_130px_130px_100px] items-center gap-2 px-3 py-2.5"
                >
                  {/* Wallet name */}
                  <span className="text-sm font-medium truncate">{r.wallet.name}</span>

                  {/* System balance */}
                  <span className="text-sm tabular-nums text-right text-muted-foreground">
                    {formatNaira(r.currentBalance)}
                  </span>

                  {/* Actual balance input */}
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={inputs[r.wallet.id] ?? ''}
                    onChange={(e) => handleInput(r.wallet.id, e.target.value)}
                    onBlur={() => handleBlur(r.wallet.id)}
                    className="h-8 text-sm text-right tabular-nums"
                  />

                  {/* Difference */}
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums text-right',
                      diff === null
                        ? 'text-muted-foreground'
                        : diff === 0
                          ? 'text-muted-foreground'
                          : diff > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {diff === null
                      ? '—'
                      : diff === 0
                        ? '—'
                        : diff > 0
                          ? `+${formatNaira(diff)}`
                          : formatNaira(diff)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Summary line */}
          <p className="text-sm text-muted-foreground px-1">
            {adjustCount === 0 && matchCount === rows.length
              ? 'All wallets already match — no adjustments needed.'
              : adjustCount === 0
                ? 'No wallets will be adjusted.'
                : adjustCount === 1
                  ? `1 wallet will be adjusted${matchCount > 0 ? `, ${matchCount} already match` : ''}.`
                  : `${adjustCount} wallets will be adjusted${matchCount > 0 ? `, ${matchCount} already match` : ''}.`}
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="button"
            onClick={handleApply}
            disabled={isDisabled}
            className="w-full"
          >
            {submitting ? 'Applying…' : 'Apply Corrections'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
