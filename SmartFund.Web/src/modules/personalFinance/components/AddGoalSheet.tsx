import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createGoal, createWallet } from '../services/personalFinanceApi';
import type { PersonalGoalDto, PersonalWalletDto } from '../types/financeTypes';
import { toast } from 'sonner';

const NO_WALLET = '__none__';
const NEW_WALLET = '__new__';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (goal: PersonalGoalDto) => void;
  wallets: PersonalWalletDto[];
}

export default function AddGoalSheet({ open, onClose, onCreated, wallets }: Props) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [walletChoice, setWalletChoice] = useState<string>(NO_WALLET);
  const [newWalletName, setNewWalletName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName('');
    setTargetAmount('');
    setDeadline('');
    setWalletChoice(NO_WALLET);
    setNewWalletName('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !targetAmount || !deadline) return;

    setSubmitting(true);
    try {
      let walletId: number | undefined;

      if (walletChoice === NEW_WALLET) {
        const wName = newWalletName.trim() || name.trim();
        const wallet = await createWallet({ name: wName, currency: 'NGN' });
        walletId = wallet.id;
      } else if (walletChoice !== NO_WALLET) {
        walletId = parseInt(walletChoice, 10);
      }

      const goal = await createGoal({
        name: name.trim(),
        targetAmount: parseFloat(targetAmount),
        deadline: new Date(deadline).toISOString(),
        walletId,
      });

      toast.success('Goal created successfully');
      onCreated(goal);
      reset();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Goal</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-2 px-4 pb-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goalName">Goal Name *</Label>
            <Input
              id="goalName"
              placeholder="e.g. iPhone 16 Pro, Emergency Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="targetAmount">Target Amount (₦) *</Label>
            <Input
              id="targetAmount"
              type="number"
              min="1"
              step="0.01"
              placeholder="e.g. 600000"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deadline">Deadline *</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Savings Wallet (optional)</Label>
            <Select value={walletChoice} onValueChange={(v) => {
              setWalletChoice(v);
              if (v === NEW_WALLET && !newWalletName) setNewWalletName(name.trim());
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose wallet..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_WALLET}>— No wallet (manual tracking) —</SelectItem>
                {wallets.map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                ))}
                <SelectItem value={NEW_WALLET}>+ Create new dedicated wallet</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Link a wallet to use its live balance as the saved amount.
            </p>
          </div>

          {walletChoice === NEW_WALLET && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newWalletName">New Wallet Name</Label>
              <Input
                id="newWalletName"
                placeholder={name.trim() || 'Wallet name'}
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Creating...' : 'Create Goal'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
