import { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setOpeningBalance } from '../services/personalFinanceApi';
import type { PersonalWalletDto } from '../types/financeTypes';

interface Props {
  wallet: PersonalWalletDto;
  txCount: number;
  onSaved: () => void;
}

const DISMISS_KEY = (walletId: number) => `sf_ob_dismissed_${walletId}`;

export default function OpeningBalancePrompt({ wallet, txCount, onSaved }: Props) {
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem(DISMISS_KEY(wallet.id)) === '1'
  );
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show if: opening balance not set AND (no transactions OR no openingBalanceDate) AND not dismissed
  const needsOpeningBalance = wallet.openingBalanceDate === null;
  const noTransactions = txCount === 0;

  if (!needsOpeningBalance || dismissed) {
    return null;
  }

  const isFirstRun = noTransactions;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY(wallet.id), '1');
    setDismissed(true);
  }

  async function handleSave() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) {
      setError('Enter a valid amount (0 or more).');
      return;
    }
    if (!date) {
      setError('Select a date.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await setOpeningBalance(wallet.id, { amount: amt, date });
      toast('Opening balance set');
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set opening balance.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative rounded-xl border border-yellow-400/40 bg-yellow-50/10 dark:bg-yellow-950/20 px-5 py-4 text-sm">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
        Set an opening balance for {wallet.name}
      </p>
      <p className="text-muted-foreground text-xs mb-4">
        {isFirstRun
          ? 'Start by setting your current balance in this wallet. This anchors all future entries.'
          : 'Set an opening balance to see accurate running totals across all your transactions.'}
      </p>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Balance (₦)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-36"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">As of date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="mb-0.5">
          {saving ? 'Saving…' : 'Set Opening Balance'}
        </Button>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
