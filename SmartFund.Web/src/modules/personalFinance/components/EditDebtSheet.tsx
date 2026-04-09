import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateDebt } from '../services/personalFinanceApi';
import type { PersonalDebtDto } from '../types/financeTypes';
import { toast } from 'sonner';

interface Props {
  debt: PersonalDebtDto | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (debt: PersonalDebtDto) => void;
}

export default function EditDebtSheet({ debt, open, onClose, onUpdated }: Props) {
  const [creditorName, setCreditorName] = useState('');
  const [totalAmountDue, setTotalAmountDue] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (debt) {
      setCreditorName(debt.creditorName);
      setTotalAmountDue(String(debt.totalAmountDue));
      setDueDate(debt.dueDate.split('T')[0]);
      setDescription(debt.description ?? '');
    }
  }, [debt]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!debt || !creditorName.trim() || !totalAmountDue || !dueDate) return;

    setSubmitting(true);
    try {
      const updated = await updateDebt(debt.id, {
        creditorName: creditorName.trim(),
        totalAmountDue: parseFloat(totalAmountDue),
        dueDate: new Date(dueDate).toISOString(),
        description: description.trim() || undefined,
      });
      toast.success('Debt updated');
      onUpdated(updated);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update debt');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Debt</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-creditorName">Creditor / Lender *</Label>
            <Input
              id="edit-creditorName"
              value={creditorName}
              onChange={(e) => setCreditorName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-principal">Principal Amount (₦)</Label>
            <Input
              id="edit-principal"
              value={debt ? `₦${debt.principalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : ''}
              disabled
              className="text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">Principal cannot be changed after creation.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-totalAmountDue">Total Amount to Repay (₦) *</Label>
            <Input
              id="edit-totalAmountDue"
              type="number"
              min={debt?.principalAmount ?? 1}
              step="0.01"
              value={totalAmountDue}
              onChange={(e) => setTotalAmountDue(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-dueDate">Due Date *</Label>
            <Input
              id="edit-dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-description">Notes</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Saving...' : 'Save Changes'}
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
