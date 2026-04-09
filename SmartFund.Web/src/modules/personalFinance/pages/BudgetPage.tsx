import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  getBudgets,
  getBudgetTracking,
  createBudget,
  updateBudget,
  deleteBudget,
  getCategories
} from '../services/personalFinanceApi';
import type { BudgetDto, BudgetTrackingDto, PersonalCategoryDto } from '../types/financeTypes';
import { PERSONAL_CATEGORY_TYPE } from '../types/financeTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Pencil, Plus, Trash2, X } from 'lucide-react';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(n);
}

const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

type TrackingMap = Record<number, BudgetTrackingDto[]>;

export default function BudgetPage() {
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<BudgetDto[]>([]);
  const [trackingMap, setTrackingMap] = useState<TrackingMap>({});
  const [categories, setCategories] = useState<PersonalCategoryDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* create form */
  const [showForm, setShowForm] = useState(false);
  const [categoryId, setCategoryId] = useState<number>(1);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* edit dialog */
  const [editingBudget, setEditingBudget] = useState<BudgetDto | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<number>(1);
  const [editAmount, setEditAmount] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  /* delete dialog */
  const [deletingBudget, setDeletingBudget] = useState<BudgetDto | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetList, cats] = await Promise.all(
        [getBudgets(), getCategories()] as const
      );
      setBudgets(budgetList);
      setCategories(cats);

      const trackingEntries = await Promise.all(
        budgetList.map(async (b) => {
          const tracking = await getBudgetTracking(b.id);
          return [b.id, tracking] as const;
        })
      );
      setTrackingMap(Object.fromEntries(trackingEntries));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  }, []);

  const expenseCategories = categories.filter(
    c => c.type === PERSONAL_CATEGORY_TYPE.Expense
  );

  const categoryNameById = useMemo(() => {
    return new Map(categories.map(c => [c.id, c.name] as const));
  }, [categories]);

  useEffect(() => {
    if (expenseCategories.length === 0) return;
    if (!expenseCategories.some(c => c.id === categoryId)) {
      setCategoryId(expenseCategories[0].id);
    }
  }, [expenseCategories, categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt <= 0) throw new Error('Enter a valid amount.');
      await createBudget({ categoryId, amount: amt, period: 1 });
      setAmount('');
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create budget.');
    } finally {
      setSubmitting(false);
    }
  }

  function openEditDialog(b: BudgetDto) {
    setEditingBudget(b);
    setEditCategoryId(b.categoryId);
    setEditAmount(String(b.amount));
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBudget) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    setEditSaving(true);
    try {
      await updateBudget(editingBudget.id, { categoryId: editCategoryId, amount: amt, period: editingBudget.period });
      toast.success('Budget updated');
      setEditingBudget(null);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update budget.');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingBudget) return;
    setDeleteConfirming(true);
    try {
      await deleteBudget(deletingBudget.id);
      toast.success('Budget deleted');
      setDeletingBudget(null);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete budget.');
    } finally {
      setDeleteConfirming(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground text-sm">
            Set spending limits per category and track progress.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? 'outline' : 'default'} className="gap-2">
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> New Budget</>}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5">
          <p className="text-sm font-semibold mb-4">New Budget</p>
          <div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Category</span>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
                    disabled={expenseCategories.length === 0}
                  >
                    {expenseCategories.length === 0 ? (
                      <option value={0}>No expense categories available</option>
                    ) : (
                      expenseCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    )}
                  </select>
                  {expenseCategories.length === 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      No expense categories yet.{' '}
                      <Link to="/finance/categories" className="font-semibold text-primary underline underline-offset-2">
                        Create a category
                      </Link>.
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Monthly Limit</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </label>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Budget'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Budget cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-7 w-32" />
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                  <Skeleton className="h-2.5 w-full rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="flex h-52 flex-col items-center justify-center gap-3">
            <p className="text-sm font-medium text-muted-foreground">No budgets created yet</p>
            <p className="text-xs text-muted-foreground">Click "+ New Budget" to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => {
            const tracking = trackingMap[b.id] ?? [];
            const latest = tracking.length > 0 ? tracking[tracking.length - 1] : null;
            const spent = latest?.spentAmount ?? 0;
            const remaining = latest?.remainingAmount ?? b.amount;
            const pct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 0;
            const overBudget = latest?.isOverBudget ?? false;

            return (
              <BudgetCard
                key={b.id}
                b={b}
                overBudget={overBudget}
                categoryName={categoryNameById.get(b.categoryId) ?? `Category #${b.categoryId}`}
                spent={spent}
                remaining={remaining}
                pct={pct}
                tracking={tracking}
                onEdit={() => openEditDialog(b)}
                onDelete={() => setDeletingBudget(b)}
              />
            );
          })}
        </div>
      )}

      {/* Edit Budget Dialog */}
      <Dialog open={editingBudget !== null} onOpenChange={(open) => { if (!open) setEditingBudget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Category</span>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(Number(e.target.value))}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Monthly Limit</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingBudget(null)} disabled={editSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Budget AlertDialog */}
      <AlertDialog open={deletingBudget !== null} onOpenChange={(open) => { if (!open) setDeletingBudget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the budget and its tracking history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteConfirming}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteConfirming}>
              {deleteConfirming ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BudgetCard(props: {
  b: BudgetDto;
  overBudget: boolean;
  categoryName: string;
  spent: number;
  remaining: number;
  pct: number;
  tracking: BudgetTrackingDto[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { b, overBudget, categoryName, spent, remaining, pct, tracking, onEdit, onDelete } = props;
  const [displayPct, setDisplayPct] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const timer = setTimeout(() => setDisplayPct(pct), 50);
    return () => clearTimeout(timer);
  }, [pct]);

  return (
    <Card className={`rounded-2xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
      overBudget ? 'border-l-4 border-l-destructive' : 'border-l-4 border-l-emerald-500'
    }`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold truncate">{categoryName}</h3>
          <div className="flex items-center gap-1 shrink-0">
            <Badge
              className={overBudget
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              }
            >
              {overBudget ? 'Over budget' : 'On track'}
            </Badge>
            <button
              type="button"
              onClick={onEdit}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Edit budget"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Delete budget"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <p className="text-2xl font-bold tracking-tight tabular-nums">
          {formatCurrency(b.amount)}
          <span className="text-sm font-normal text-muted-foreground"> / month</span>
        </p>

        <div>
          <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1.5">
            <span>Spent: {formatCurrency(spent)}</span>
            <span>
              {remaining >= 0
                ? `${formatCurrency(remaining)} left`
                : `${formatCurrency(Math.abs(remaining))} over`}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${overBudget ? 'bg-rose-500' : 'bg-primary'}`}
              style={{ width: `${Math.min(displayPct, 100)}%` }}
            />
          </div>
        </div>

        {tracking.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">History</p>
            {tracking.slice(-3).reverse().map((t, i) => (
              <div key={i} className="flex justify-between text-xs text-muted-foreground">
                <span>{MONTH_NAMES[t.month]} {t.year}</span>
                <span className="font-medium">{formatCurrency(t.spentAmount)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
