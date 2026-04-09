import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldLabel, FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { getCategories, editTransaction } from '../services/personalFinanceApi';
import { PERSONAL_CATEGORY_TYPE } from '../types/financeTypes';
import type { PersonalCategoryDto, PersonalTransactionDto } from '../types/financeTypes';

interface Props {
  transaction: PersonalTransactionDto | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditTransactionSheet({ transaction, onClose, onSaved }: Props) {
  const [categories, setCategories] = useState<PersonalCategoryDto[]>([]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const txType = transaction?.type?.toLowerCase();
  const categoryType = txType === 'income' ? PERSONAL_CATEGORY_TYPE.Income : PERSONAL_CATEGORY_TYPE.Expense;

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (transaction) {
      setAmount(String(transaction.amount));
      setDate(transaction.date.slice(0, 10));
      setCategoryId(transaction.categoryId ? String(transaction.categoryId) : '');
      setDescription(transaction.description ?? '');
      setErrors({});
    }
  }, [transaction]);

  const filteredCategories = categories.filter((c) => c.type === categoryType);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) errs.amount = 'Amount must be greater than zero.';
    if (!date) errs.date = 'Date is required.';
    if (!categoryId) errs.categoryId = 'Category is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transaction || !validate()) return;
    setSaving(true);
    try {
      await editTransaction(transaction.id, {
        categoryId: Number(categoryId),
        amount: parseFloat(amount),
        date,
        description: description.trim() || null,
      });
      toast.success('Transaction updated');
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update transaction';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={transaction !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Edit Transaction</SheetTitle>
        </SheetHeader>
        {transaction && (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 px-1">
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span><span className="font-medium">Type:</span> {transaction.type}</span>
              <span><span className="font-medium">Wallet:</span> {transaction.wallet}</span>
            </div>

            <Field>
              <FieldLabel>Amount (₦)</FieldLabel>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              {errors.amount && <FieldError>{errors.amount}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>Date</FieldLabel>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {errors.date && <FieldError>{errors.date}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>Category</FieldLabel>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <FieldError>{errors.categoryId}</FieldError>}
            </Field>

            <Field>
              <FieldLabel>Description <span className="text-muted-foreground">(optional)</span></FieldLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional note"
                rows={2}
              />
            </Field>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Spinner className="mr-2 h-4 w-4" />Saving…</> : 'Save changes'}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
