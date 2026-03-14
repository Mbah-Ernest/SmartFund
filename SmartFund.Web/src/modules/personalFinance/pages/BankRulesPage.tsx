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


/* ══════════════════════════════════════════════════════════════════════════ */
export default function BankRulesPage() {
  const [rules, setRules] = useState<BankRuleDto[]>([]);
  const [categories, setCategories] = useState<PersonalCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Pattern tester
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /* ── Load data ───────────────────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getBankRules().then(setRules),
      getCategories().then(setCategories),
    ])
      .catch(err => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  /* ── Form helpers ────────────────────────────────────────────────────── */
  function patchForm(patch: Partial<RuleForm>) {
    setForm(prev => ({ ...prev, ...patch }));
    setTestResult(null); // reset test when form changes
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

  /* ── Save ────────────────────────────────────────────────────────────── */
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
        setSuccessMsg('Rule updated.');
      } else {
        await createBankRule(payload);
        await getBankRules().then(setRules);
        setSuccessMsg('Rule created.');
      }
      setTimeout(() => setSuccessMsg(null), 3000);
      closeForm();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete / deactivate ─────────────────────────────────────────────── */
  async function handleDelete(rule: BankRuleDto) {
    if (!confirm(`Deactivate rule "${rule.matchText}"?`)) return;
    setDeletingId(rule.id);
    try {
      await deleteBankRule(rule.id);
      setRules(prev => prev.filter(r => r.id !== rule.id));
      setSuccessMsg('Rule deactivated.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  /* ── Test pattern ────────────────────────────────────────────────────── */
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

  /* ──────────────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Categorization Rules
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {activeRules.length > 0
              ? `${activeRules.length} active rule${activeRules.length !== 1 ? 's' : ''} · Evaluated in priority order (lowest first)`
              : 'No rules yet — create one to start auto-categorizing transactions.'}
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97]"
          >
            <PlusIcon className="h-4 w-4" />
            New Rule
          </button>
        )}
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/60 px-5 py-3 dark:border-emerald-800/50">
          <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{successMsg}</p>
          <button type="button" onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-50/60 px-5 py-4 dark:border-rose-900/50">
          <ExclamationIcon className="h-5 w-5 mt-0.5 shrink-0 text-rose-500" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Error</p>
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
          <button type="button" onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="animate-fade-in-up rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {editingId !== null ? 'Edit Rule' : 'New Rule'}
            </h2>
            <button type="button" onClick={closeForm} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">

            {/* Match text */}
            <div className="sm:col-span-2">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Match Text</span>
                <input
                  type="text"
                  value={form.matchText}
                  onChange={e => patchForm({ matchText: e.target.value })}
                  placeholder={form.isRegex ? 'e.g. SHOPRITE|SUPERMART' : 'e.g. SHOPRITE'}
                  spellCheck={false}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <div className="mt-2 flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={form.isRegex} onChange={e => patchForm({ isRegex: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-500" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Regular expression</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={form.caseSensitive} onChange={e => patchForm({ caseSensitive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-500" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Case sensitive</span>
                </label>
              </div>
            </div>

            {/* Category */}
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Category</span>
              <select
                value={form.categoryId}
                onChange={e => patchForm({ categoryId: Number(e.target.value) || '' })}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            {/* Transaction type */}
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Transaction Type</span>
              <select
                value={form.transactionType}
                onChange={e => patchForm({ transactionType: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-950"
              >
                {TX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>

            {/* Priority */}
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Priority <span className="normal-case font-normal text-slate-400">(lower = evaluated first)</span>
              </span>
              <input
                type="number"
                value={form.priority}
                min={1}
                max={9999}
                onChange={e => patchForm({ priority: Number(e.target.value) || 100 })}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            {/* Description */}
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Description <span className="normal-case font-normal text-slate-400">(optional)</span>
              </span>
              <input
                type="text"
                value={form.description}
                onChange={e => patchForm({ description: e.target.value })}
                placeholder="e.g. Supermarket purchases"
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            {/* AutoPostCredits */}
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                <input
                  type="checkbox"
                  checked={form.autoPostCredits}
                  onChange={e => patchForm({ autoPostCredits: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-blue-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Auto-post credits (money in)
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    By default, credit transactions always queue for manual review. Enable this to let the rule auto-post matching credits (use with caution — salary, refunds, and transfers look similar).
                  </p>
                </div>
              </label>
            </div>

            {/* Pattern tester */}
            {form.matchText.trim() && (
              <div className="sm:col-span-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Test Pattern</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testText}
                    onChange={e => { setTestText(e.target.value); setTestResult(null); }}
                    placeholder="Enter a narration to test…"
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || !testText.trim()}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {testing ? '…' : 'Test'}
                  </button>
                </div>
                {testResult !== null && (
                  <div className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                    testResult
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                  }`}>
                    {testResult ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
                    {testResult ? 'Match — this rule would apply' : 'No match'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form actions */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-60"
            >
              {saving ? 'Saving…' : editingId !== null ? 'Save Changes' : 'Create Rule'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">

        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : activeRules.length === 0 && inactiveRules.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800">
              <RulesIcon className="h-7 w-7 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No rules yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Create your first rule or categorize an inbox item with "Remember" checked.
              </p>
            </div>
            <button type="button" onClick={openCreate}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:-translate-y-0.5 transition-all">
              <PlusIcon className="h-4 w-4" />
              Create First Rule
            </button>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-slate-100 px-6 py-3 dark:border-slate-800">
              {['Pattern', 'Category', 'Type', 'Priority / Stats', ''].map((h, i) => (
                <span key={i} className={`text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${i === 3 ? 'text-center' : ''}`}>
                  {h}
                </span>
              ))}
            </div>

            {/* Active rules */}
            {activeRules.map(rule => (
              <RuleRow
                key={rule.id}
                rule={rule}
                categoryName={categoryName(rule.categoryId)}
                onEdit={() => openEdit(rule)}
                onDelete={() => handleDelete(rule)}
                isDeleting={deletingId === rule.id}
              />
            ))}

            {/* Inactive rules (collapsed section) */}
            {inactiveRules.length > 0 && (
              <>
                <div className="border-t border-slate-100 px-6 py-2 dark:border-slate-800">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Inactive ({inactiveRules.length})
                  </p>
                </div>
                {inactiveRules.map(rule => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    categoryName={categoryName(rule.categoryId)}
                    onEdit={() => openEdit(rule)}
                    onDelete={() => handleDelete(rule)}
                    isDeleting={deletingId === rule.id}
                    dimmed
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Rule row component ──────────────────────────────────────────────────── */
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
    <div
      className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-slate-100 px-6 py-4 transition-colors last:border-0 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/30 ${
        dimmed ? 'opacity-50' : ''
      }`}
    >
      {/* Pattern */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="truncate rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {rule.matchText}
          </code>
          {rule.isRegex && (
            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
              regex
            </span>
          )}
          {rule.autoPostCredits && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
              credits
            </span>
          )}
        </div>
        {rule.description && (
          <p className="mt-0.5 text-xs text-slate-400">{rule.description}</p>
        )}
        {rule.lastMatchedAtUtc && (
          <p className="mt-0.5 text-[11px] text-slate-400">
            Last matched {new Date(rule.lastMatchedAtUtc).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' })}
          </p>
        )}
      </div>

      {/* Category */}
      <p className="truncate text-sm text-slate-700 dark:text-slate-300">{categoryName}</p>

      {/* Type */}
      <p className="text-sm text-slate-500 dark:text-slate-400">{rule.transactionType}</p>

      {/* Priority / stats */}
      <div className="text-center">
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          P{rule.priority}
        </span>
        {rule.matchCount > 0 && (
          <p className="mt-0.5 text-[11px] text-slate-400">{rule.matchCount} match{rule.matchCount !== 1 ? 'es' : ''}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          title="Deactivate"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
        >
          {isDeleting
            ? <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
            : <TrashIcon className="h-3.5 w-3.5" />
          }
        </button>
      </div>
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────────── */
function PlusIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
    </svg>
  );
}

function RulesIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 15l2 2 4-4" />
    </svg>
  );
}

function PencilIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function CheckCircleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
  );
}

function XCircleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
  );
}

function ExclamationIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4M12 17h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

function XIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

