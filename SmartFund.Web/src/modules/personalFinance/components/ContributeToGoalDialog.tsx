import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { contributeToGoal } from '../services/personalFinanceApi';
import type { PersonalGoalDto } from '../types/financeTypes';
import { toast } from 'sonner';

interface Props {
  goal: PersonalGoalDto | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ContributeToGoalDialog({ goal, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!goal || !amount) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;

    setSubmitting(true);
    try {
      await contributeToGoal(goal.id, { amount: parsed });
      toast.success(`₦${parsed.toLocaleString('en-NG')} added to ${goal.name}`);
      setAmount('');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to contribute');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={goal !== null} onOpenChange={(o) => { if (!o) { setAmount(''); onClose(); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Contribute to {goal?.name ?? 'Goal'}</AlertDialogTitle>
          <AlertDialogDescription>
            Enter the amount you want to add toward this goal.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 py-2">
          <Label htmlFor="contributeAmount">Amount (₦)</Label>
          <Input
            id="contributeAmount"
            type="number"
            min="1"
            step="0.01"
            placeholder="e.g. 50000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setAmount(''); onClose(); }}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={submitting || !amount || parseFloat(amount) <= 0}
          >
            {submitting ? 'Adding...' : 'Contribute'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
