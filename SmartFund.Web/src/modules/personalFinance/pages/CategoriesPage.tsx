import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  createCategory,
  getCategories,
  renameCategory,
  deleteCategory,
} from '../services/personalFinanceApi';
import type { PersonalCategoryDto } from '../types/financeTypes';
import { PERSONAL_CATEGORY_TYPE } from '../types/financeTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Plus, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type CategoryTypeTab = 'expense' | 'income';

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<PersonalCategoryDto[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<number>(PERSONAL_CATEGORY_TYPE.Expense);
  const [submitting, setSubmitting] = useState(false);

  const [tab, setTab] = useState<CategoryTypeTab>('expense');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PersonalCategoryDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const expenseCategories = useMemo(
    () => categories.filter(c => c.type === PERSONAL_CATEGORY_TYPE.Expense),
    [categories]
  );

  const incomeCategories = useMemo(
    () => categories.filter(c => c.type === PERSONAL_CATEGORY_TYPE.Income),
    [categories]
  );

  const activeList = tab === 'expense' ? expenseCategories : incomeCategories;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!name.trim()) throw new Error('Enter a category name.');
      await createCategory({ name: name.trim(), type });
      setName('');
      setType(PERSONAL_CATEGORY_TYPE.Expense);
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create category.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteCategory(deleteTarget.id);
      toast('Category deleted');
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete category.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleRename(id: number) {
    setSubmitting(true);
    setError(null);
    try {
      if (!editName.trim()) throw new Error('Enter a category name.');
      await renameCategory(id, { name: editName.trim() });
      setEditingId(null);
      setEditName('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to rename category.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 pt-0 gap-4">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground text-sm">
            Create and manage categories used for transactions and budgets (e.g. Tithe).
          </p>
        </div>
        <Button onClick={() => setShowForm(v => !v)} variant={showForm ? 'outline' : 'default'} className="gap-2">
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> New Category</>}
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
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm">New Category</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Name</span>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tithe"
                    className="mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Type</span>
                  <select
                    value={type}
                    onChange={(e) => setType(Number(e.target.value))}
                    className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    <option value={PERSONAL_CATEGORY_TYPE.Expense}>Expense</option>
                    <option value={PERSONAL_CATEGORY_TYPE.Income}>Income</option>
                  </select>
                </label>
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Category'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="flex flex-col flex-1 min-h-0 rounded-xl">
        <CardHeader className="shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm">Your categories</CardTitle>
              <CardDescription>Used for transactions, budgets and reporting</CardDescription>
            </div>
            <div className="flex gap-2">
              {([
                { key: 'expense', label: `Expenses (${expenseCategories.length})` },
                { key: 'income', label: `Income (${incomeCategories.length})` }
              ] as const).map(t => (
                <Button
                  key={t.key}
                  type="button"
                  size="sm"
                  variant={tab === t.key ? 'default' : 'outline'}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-3 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-3 w-12" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="ml-auto h-7 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : activeList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-14 text-center">
                    <p className="text-sm font-medium text-muted-foreground">No categories yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Create one to start categorizing transactions.</p>
                  </TableCell>
                </TableRow>
              ) : (
                activeList.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {editingId === c.id ? (
                        <Input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="max-w-xs"
                        />
                      ) : (
                        <span className="font-semibold">{c.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.id}</TableCell>
                    <TableCell className="text-right">
                      {editingId === c.id ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleRename(c.id)}
                            disabled={submitting}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => { setEditingId(null); setEditName(''); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(c.id);
                              setEditName(c.name);
                            }}
                          >
                            Rename
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(c)}
                            title="Delete category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the category. Only categories with no existing transactions can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
