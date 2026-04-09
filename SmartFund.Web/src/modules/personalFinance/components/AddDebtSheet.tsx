import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createDebt } from '../services/personalFinanceApi';
import type { PersonalDebtDto } from '../types/financeTypes';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (debt: PersonalDebtDto) => void;
}

export default function AddDebtSheet({ open, onClose, onCreated }: Props) {
  const [creditorName, setCreditorName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [totalAmountDue, setTotalAmountDue] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCreditorName('');
    setPrincipalAmount('');
    setTotalAmountDue('');
    setDueDate('');
    setDescription('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!creditorName.trim() || !principalAmount || !totalAmountDue || !dueDate) return;

    setSubmitting(true);
    try {
      const debt = await createDebt({
        creditorName: creditorName.trim(),
        principalAmount: parseFloat(principalAmount),
        totalAmountDue: parseFloat(totalAmountDue),
        dueDate: new Date(dueDate).toISOString(),
        description: description.trim() || undefined,
      });
      toast.success('Debt added successfully');
      onCreated(debt);
      reset();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add debt');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Debt</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="creditorName">Creditor / Lender *</Label>
            <Input
              id="creditorName"
              placeholder="e.g. Uncle Chidi, GTBank"
              value={creditorName}
              onChange={(e) => setCreditorName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="principalAmount">Principal Amount (₦) *</Label>
            <Input
              id="principalAmount"
              type="number"
              min="1"
              step="0.01"
              placeholder="Amount borrowed"
              value={principalAmount}
              onChange={(e) => setPrincipalAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="totalAmountDue">Total Amount to Repay (₦) *</Label>
            <Input
              id="totalAmountDue"
              type="number"
              min={principalAmount || '1'}
              step="0.01"
              placeholder="Principal + interest"
              value={totalAmountDue}
              onChange={(e) => setTotalAmountDue(e.target.value)}
              required
            />
            {principalAmount && totalAmountDue && parseFloat(totalAmountDue) > parseFloat(principalAmount) && (
              <p className="text-xs text-muted-foreground">
                Interest: ₦{(parseFloat(totalAmountDue) - parseFloat(principalAmount)).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              placeholder="What's this debt for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Adding...' : 'Add Debt'}
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
