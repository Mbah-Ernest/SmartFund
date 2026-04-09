import { useEffect, useState } from 'react';
import {
  getBankRules,
  createBankRule,
  updateBankRule,
  deleteBankRule,
  testBankRule,
  type BankRuleDto,
} from '../services/personalFinanceApi';
import { getCategories } from '../services/personalFinanceApi';
import type { PersonalCategoryDto } from '../types/financeTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
import { AlertCircle, CheckCircle2, XCircle, X, Plus, Pencil, Trash2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TX_TYPES = ['Expense', 'Income', 'Transfer', 'InvestmentContribution'];

interface RuleForm {
  matchText: string;
  isRegex: boolean;
  caseSensitive: boolean;
  categoryId: number | '';
  transactionType: string;
  priority: number;
  description: string;
  autoPostCredits: boolean;
}

const EMPTY_FORM: RuleForm = {
  matchText: '',
  isRegex: false,
  caseSensitive: false,
  categoryId: '',
  transactionType: 'Expense',
  priority: 100,
  description: '',
  autoPostCredits: false,
};

function extractErrorMessage(err: unknown): string {
  if (err != null && typeof err === 'object' && 'message' in err) {
    return String((err as { message: string }).message);
  }
  return 'An unexpected error occurred.';
}

export default function BankRulesPage() {
  const [rules, setRules] = useState<BankRuleDto[]>([]);
  const [categories, setCategories] = useState<PersonalCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BankRuleDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getBankRules().then(setRules),
      getCategories().then(setCategories),
    ])
      .catch(err => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function patchForm(patch: Partial<RuleForm>) {
    setForm(prev => ({ ...prev, ...patch }));
    setTestResult(null);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setTestText('');
    setTestResult(null);
    setError(null);
  }

  function openEdit(rule: BankRuleDto) {
    setForm({
      matchText: rule.matchText,
      isRegex: rule.isRegex,
      caseSensitive: rule.caseSensitive,
      categoryId: rule.categoryId,
      transactionType: rule.transactionType,
      priority: rule.priority,
      description: rule.description ?? '',
      autoPostCredits: rule.autoPostCredits,
    });
    setEditingId(rule.id);
    setShowForm(true);
    setTestText('');
    setTestResult(null);
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
    setTestResult(null);
  }

  async function handleSave() {
    if (!form.matchText.trim()) { setError('Match text is required.'); return; }
    if (form.categoryId === '') { setError('Category is required.'); return; }
    setSaving(true);
    setError(null);
    const payload = {
      matchText: form.matchText.trim(),
      isRegex: form.isRegex,
      caseSensitive: form.caseSensitive,
      categoryId: form.categoryId as number,
      transactionType: form.transactionType,
      priority: form.priority,
      description: form.description.trim() || null,
      autoPostCredits: form.autoPostCredits,
    };
    try {
      if (editingId !== null) {
        await updateBankRule(editingId, payload);
        await getBankRules().then(setRules);
        toast.success('Rule updated.');
      } else {
        await createBankRule(payload);
        await getBankRules().then(setRules);
        toast.success('Rule created.');
      }
      closeForm();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(rule: BankRuleDto) {
    setDeleteTarget(null);
    setDeletingId(rule.id);
    try {
      await deleteBankRule(rule.id);
      setRules(prev => prev.filter(r => r.id !== rule.id));
      toast.success('Rule deactivated.');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleTest() {
    if (!form.matchText.trim() || !testText.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testBankRule({
        matchText: form.matchText,
        isRegex: form.isRegex,
        caseSensitive: form.caseSensitive,
        text: testText,
      });
      setTestResult(result.matches);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setTesting(false);
    }
  }

  const categoryName = (id: number) => categories.find(c => c.id === id)?.name ?? `#${id}`;
  const activeRules = rules.filter(r => r.isActive);
  const inactiveRules = rules.filter(r => !r.isActive);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorization Rules</h1>
          <p className="text-muted-foreground text-sm">
            {activeRules.length > 0
              ? `${activeRules.length} active rule${activeRules.length !== 1 ? 's' : ''} · Evaluated in priority order (lowest first)`
              : 'No rules yet — create one to start auto-categorizing transactions.'}
          </p>
        </div>
        {!showForm && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Rule
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-2">
            {error}
            <button type="button" onClick={() => setError(null)} className="shrink-0">
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <Card className="rounded-xl">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">{editingId !== null ? 'Edit Rule' : 'New Rule'}</h2>
              <Button type="button" variant="ghost" size="icon" onClick={closeForm} className="h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Match Text</span>
                  <Input
                    type="text"
                    value={form.matchText}
                    onChange={e => patchForm({ matchText: e.target.value })}
                    placeholder={form.isRegex ? 'e.g. SHOPRITE|SUPERMART' : 'e.g. SHOPRITE'}
                    spellCheck={false}
                    className="mt-1 font-mono"
                  />
                </label>
                <div className="mt-2 flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox checked={form.isRegex} onCheckedChange={c => patchForm({ isRegex: !!c })} />
                    <span className="text-xs font-medium">Regular expression</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox checked={form.caseSensitive} onCheckedChange={c => patchForm({ caseSensitive: !!c })} />
                    <span className="text-xs font-medium">Case sensitive</span>
                  </label>
                </div>
              </div>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
                <select
                  value={form.categoryId}
                  onChange={e => patchForm({ categoryId: Number(e.target.value) || '' })}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select category…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Transaction Type</span>
                <select
                  value={form.transactionType}
                  onChange={e => patchForm({ transactionType: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Priority <span className="normal-case font-normal text-muted-foreground">(lower = evaluated first)</span>
                </span>
                <Input
                  type="number"
                  value={form.priority}
                  min={1}
                  max={9999}
                  onChange={e => patchForm({ priority: Number(e.target.value) || 100 })}
                  className="mt-1"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Description <span className="normal-case font-normal text-muted-foreground">(optional)</span>
                </span>
                <Input
                  type="text"
                  value={form.description}
                  onChange={e => patchForm({ description: e.target.value })}
                  placeholder="e.g. Supermarket purchases"
                  className="mt-1"
                />
              </label>

              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50">
                  <Checkbox
                    checked={form.autoPostCredits}
                    onCheckedChange={c => patchForm({ autoPostCredits: !!c })}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-semibold">Auto-post credits (money in)</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      By default, credit transactions always queue for manual review. Enable this to let the rule auto-post matching credits (use with caution — salary, refunds, and transfers look similar).
                    </p>
                  </div>
                </label>
              </div>

              {form.matchText.trim() && (
                <div className="sm:col-span-2 rounded-xl border p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Test Pattern</p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={testText}
                      onChange={e => { setTestText(e.target.value); setTestResult(null); }}
                      placeholder="Enter a narration to test…"
                      className="flex-1 font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTest}
                      disabled={testing || !testText.trim()}
                    >
                      {testing ? '…' : 'Test'}
                    </Button>
                  </div>
                  {testResult !== null && (
                    <div className={cn(
                      'mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold',
                      testResult
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                    )}>
                      {testResult ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {testResult ? 'Match — this rule would apply' : 'No match'}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : editingId !== null ? 'Save Changes' : 'Create Rule'}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deactivate confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate rule?</AlertDialogTitle>
            <AlertDialogDescription>
              The rule <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{deleteTarget?.matchText}</code> will be deactivated and no longer applied to new transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && void handleDelete(deleteTarget)}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rules table */}
      <Card className="rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : activeRules.length === 0 && inactiveRules.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <ListChecks className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">No rules yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create your first rule or categorize an inbox item with "Remember" checked.
                </p>
              </div>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b px-6 py-3">
                {['Pattern', 'Category', 'Type', 'Priority / Stats', ''].map((h, i) => (
                  <span key={i} className={cn('text-[11px] font-semibold uppercase tracking-wider text-muted-foreground', i === 3 && 'text-center')}>
                    {h}
                  </span>
                ))}
              </div>

              {activeRules.map(rule => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  categoryName={categoryName(rule.categoryId)}
                  onEdit={() => openEdit(rule)}
                  onDelete={() => setDeleteTarget(rule)}
                  isDeleting={deletingId === rule.id}
                />
              ))}

              {inactiveRules.length > 0 && (
                <>
                  <div className="border-t px-6 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Inactive ({inactiveRules.length})
                    </p>
                  </div>
                  {inactiveRules.map(rule => (
                    <RuleRow
                      key={rule.id}
                      rule={rule}
                      categoryName={categoryName(rule.categoryId)}
                      onEdit={() => openEdit(rule)}
                      onDelete={() => setDeleteTarget(rule)}
                      isDeleting={deletingId === rule.id}
                      dimmed
                    />
                  ))}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RuleRow({
  rule,
  categoryName,
  onEdit,
  onDelete,
  isDeleting,
  dimmed = false,
}: {
  rule: BankRuleDto;
  categoryName: string;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  dimmed?: boolean;
}) {
  return (
    <div className={cn(
      'grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 border-b px-6 py-4 transition-colors last:border-0 hover:bg-muted/30',
      dimmed && 'opacity-50'
    )}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="truncate rounded bg-muted px-2 py-0.5 font-mono text-xs">
            {rule.matchText}
          </code>
          {rule.isRegex && (
            <Badge className="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400 text-[10px]">
              regex
            </Badge>
          )}
          {rule.autoPostCredits && (
            <Badge className="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 text-[10px]">
              credits
            </Badge>
          )}
        </div>
        {rule.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{rule.description}</p>
        )}
        {rule.lastMatchedAtUtc && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Last matched {new Date(rule.lastMatchedAtUtc).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}
          </p>
        )}
      </div>

      <p className="truncate text-sm text-muted-foreground">{categoryName}</p>
      <p className="text-sm text-muted-foreground">{rule.transactionType}</p>

      <div className="text-center">
        <Badge variant="secondary" className="text-xs">P{rule.priority}</Badge>
        {rule.matchCount > 0 && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{rule.matchCount} match{rule.matchCount !== 1 ? 'es' : ''}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" onClick={onEdit} title="Edit" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isDeleting}
          title="Deactivate"
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          {isDeleting ? (
            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
