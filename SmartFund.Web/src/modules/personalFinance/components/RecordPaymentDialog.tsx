import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { recordDebtPayment } from '../services/personalFinanceApi';
import type { PersonalDebtDto } from '../types/financeTypes';
import { toast } from 'sonner';

interface Props {
  debt: PersonalDebtDto | null;
  open: boolean;
  onClose: () => void;
  onRecorded: (updatedDebt: PersonalDebtDto) => void;
}

export default function RecordPaymentDialog({ debt, open, onClose, onRecorded }: Props) {
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setAmount('');
    setNote('');
    setPaidOn(new Date().toISOString().split('T')[0]);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!debt || !amount || !paidOn) return;

    setSubmitting(true);
    try {
      const { updatedDebt } = await recordDebtPayment(debt.id, {
        amount: parseFloat(amount),
        paidOn: new Date(paidOn).toISOString(),
        note: note.trim() || undefined,
      });
      toast.success('Payment recorded');
      onRecorded(updatedDebt);
      handleClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  }

  if (!debt) return null;

  const remaining = debt.remainingBalance;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment — {debt.creditorName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-amount">Amount (₦) *</Label>
            <Input
              id="pay-amount"
              type="number"
              min="0.01"
              max={remaining}
              step="0.01"
              placeholder={`Max: ₦${remaining.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Remaining balance: ₦{remaining.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-date">Payment Date *</Label>
            <Input
              id="pay-date"
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-note">Note (optional)</Label>
            <Input
              id="pay-note"
              placeholder="e.g. Bank transfer"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
