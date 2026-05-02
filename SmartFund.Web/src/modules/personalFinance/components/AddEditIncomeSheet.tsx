import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createIncomeScheduleItem, updateIncomeScheduleItem } from '../services/personalFinanceApi';
import type {
  IncomeScheduleItemDto,
  IncomeScheduleDirection,
  IncomeScheduleKind,
  IncomeRecurrenceInterval,
} from '../types/financeTypes';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (item: IncomeScheduleItemDto) => void;
  item?: IncomeScheduleItemDto;
}

export default function AddEditIncomeSheet({ open, onClose, onSaved, item }: Props) {
  const isEdit = !!item;

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<IncomeScheduleDirection>('Inflow');
  const [kind, setKind] = useState<IncomeScheduleKind>('Recurring');
  const [interval, setInterval] = useState<IncomeRecurrenceInterval | ''>('Monthly');
  const [nextDate, setNextDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setLabel(item.label);
      setAmount(String(item.amount));
      setDirection(item.direction ?? 'Inflow');
      setKind(item.kind);
      setInterval(item.recurrenceInterval ?? '');
      setNextDate(item.nextExpectedDate.slice(0, 10));
      setEndDate(item.endDate ? item.endDate.slice(0, 10) : '');
      setNotes(item.notes ?? '');
    } else {
      setLabel('');
      setAmount('');
      setDirection('Inflow');
      setKind('Recurring');
      setInterval('Monthly');
      setNextDate('');
      setEndDate('');
      setNotes('');
    }
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !amount || !nextDate) return;
    if (kind === 'Recurring' && endDate && endDate < nextDate) {
      toast.error('End date cannot be earlier than next expected date');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        label: label.trim(),
        amount: parseFloat(amount),
        direction,
        kind,
        recurrenceInterval: kind === 'Recurring' ? (interval as IncomeRecurrenceInterval) : undefined,
        nextExpectedDate: new Date(nextDate).toISOString(),
        endDate: kind === 'Recurring' && endDate ? new Date(endDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
      };

      const result = isEdit
        ? await updateIncomeScheduleItem(item!.id, payload)
        : await createIncomeScheduleItem(payload);

      toast.success(isEdit ? 'Income schedule updated' : 'Income schedule added');
      onSaved(result);
      if (!isEdit) {
        setLabel('');
        setAmount('');
        setDirection('Inflow');
        setKind('Recurring');
        setInterval('Monthly');
        setNextDate('');
        setEndDate('');
        setNotes('');
      }
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Schedule Item' : 'Add Planned Cashflow'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-2 px-4 pb-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Label *</Label>
            <Input
              id="label"
              placeholder="e.g. Monthly Salary, Spotify Subscription"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Direction *</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as IncomeScheduleDirection)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inflow">Income (Inflow)</SelectItem>
                <SelectItem value="Outflow">Expense (Outflow)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="amount">Amount (₦) *</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="Expected amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Type *</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as IncomeScheduleKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Recurring">Recurring</SelectItem>
                <SelectItem value="OneTime">One-Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kind === 'Recurring' && (
            <div className="flex flex-col gap-1.5">
              <Label>Recurrence Interval *</Label>
              <Select value={interval} onValueChange={(v) => setInterval(v as IncomeRecurrenceInterval)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Daily">Daily</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="BiWeekly">Bi-Weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {kind === 'Recurring' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">End Date (optional)</Label>
              <Input
                id="endDate"
                type="date"
                min={nextDate || undefined}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nextDate">Next Expected Date *</Label>
            <Input
              id="nextDate"
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional details"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? (isEdit ? 'Saving...' : 'Adding...') : (isEdit ? 'Save Changes' : 'Add Item')}
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
