import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  recordIncome,
  recordExpense,
  recordTransfer,
  recordInvestmentContribution
} from '../services/personalFinanceApi';
import type { PersonalWalletDto, PersonalCategoryDto } from '../types/financeTypes';
import { PERSONAL_CATEGORY_TYPE } from '../types/financeTypes';
import type { TrancheDto } from '../../../types/api';

type TxType = 'income' | 'expense' | 'transfer' | 'investment';

interface Props {
  walletId: number;
  wallets: PersonalWalletDto[];
  categories: PersonalCategoryDto[];
  tranches: TrancheDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function QuickEntrySheet({
  walletId: initialWalletId,
  wallets,
  categories,
  tranches,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const [txType, setTxType] = useState<TxType>('expense');
  const [walletId, setWalletId] = useState<number>(initialWalletId);
  const [destWalletId, setDestWalletId] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [trancheId, setTrancheId] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync walletId when prop changes (tab switch)
  useEffect(() => {
    setWalletId(initialWalletId);
  }, [initialWalletId]);

  const filteredCategories = useMemo(() => {
    if (txType === 'transfer' || txType === 'investment') return [];
    const type = txType === 'income'
      ? PERSONAL_CATEGORY_TYPE.Income
      : PERSONAL_CATEGORY_TYPE.Expense;
    return categories.filter((c) => c.type === type);
  }, [categories, txType]);

  useEffect(() => {
    if (txType === 'transfer' || txType === 'investment') return;
    if (filteredCategories.length === 0) return;
    if (!filteredCategories.some((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [txType, filteredCategories, categoryId]);

  useEffect(() => {
    if (txType !== 'transfer') return;
    if (wallets.length < 2) return;
    const fallback = wallets.find((w) => w.id !== walletId) ?? wallets[0];
    if (destWalletId === 0 || destWalletId === walletId) {
      setDestWalletId(fallback.id);
    }
  }, [txType, wallets, walletId, destWalletId]);

  useEffect(() => {
    if (txType !== 'investment') return;
    if (tranches.length === 0) return;
    if (trancheId === 0 || !tranches.some((t) => t.id === trancheId)) {
      setTrancheId(tranches[0].id);
    }
  }, [txType, tranches, trancheId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      if (txType === 'income') {
        await recordIncome({ walletId, categoryId, amount: amt, description, date });
      } else if (txType === 'expense') {
        await recordExpense({ walletId, categoryId, amount: amt, description, date });
      } else if (txType === 'investment') {
        if (trancheId <= 0) throw new Error('Select an investment tranche.');
        await recordInvestmentContribution({ walletId, trancheId, amount: amt, description });
      } else {
        await recordTransfer({
          sourceWalletId: walletId,
          destinationWalletId: destWalletId,
          amount: amt,
          description,
          date,
        });
      }
      toast('Transaction recorded');
      // Keep sheet open for batch entry — reset only the variable fields
      setAmount('');
      setDescription('');
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record transaction.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Record Transaction</SheetTitle>
          <SheetDescription>Add a new income, expense, or transfer entry.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Type toggle */}
          <div className="flex flex-wrap gap-2">
            {(['income', 'expense', 'transfer', 'investment'] as TxType[]).map((t) => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={txType === t ? 'default' : 'outline'}
                onClick={() => setTxType(t)}
                className="capitalize"
              >
                {t === 'investment' ? 'Invest' : t}
              </Button>
            ))}
          </div>

          {/* Wallet */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {txType === 'transfer' ? 'Source Wallet' : txType === 'investment' ? 'From Wallet' : 'Wallet'}
            </label>
            <Select
              value={String(walletId)}
              onValueChange={(v) => setWalletId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destination wallet / Category / Tranche */}
          {txType === 'transfer' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Destination Wallet</label>
              <Select
                value={String(destWalletId)}
                onValueChange={(v) => setDestWalletId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : txType === 'investment' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Investment Tranche</label>
              <Select
                value={String(trancheId)}
                onValueChange={(v) => setTrancheId(Number(v))}
                disabled={tranches.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tranche" />
                </SelectTrigger>
                <SelectContent>
                  {tranches.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.trancheCode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select
                value={String(categoryId)}
                onValueChange={(v) => setCategoryId(Number(v))}
                disabled={filteredCategories.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filteredCategories.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  No categories yet.{' '}
                  <Link to="/finance/categories" className="font-semibold text-primary underline underline-offset-2">
                    Create a category
                  </Link>.
                </p>
              )}
            </div>
          )}

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Amount</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => {
                if (amount !== '' && !isNaN(parseFloat(amount))) {
                  setAmount(parseFloat(amount).toFixed(2));
                }
              }}
              placeholder="0.00"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            {txType === 'investment' ? (
              <div className="rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                Uses current time
              </div>
            ) : (
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving…' : 'Record Transaction'}
          </Button>
        </form>

        <SheetFooter className="mt-4 pt-4 border-t">
          <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
