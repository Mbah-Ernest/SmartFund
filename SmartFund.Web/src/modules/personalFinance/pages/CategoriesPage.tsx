import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createCategory,
  getCategories,
  renameCategory
} from '../services/personalFinanceApi';
import type { PersonalCategoryDto } from '../types/financeTypes';
import { PERSONAL_CATEGORY_TYPE } from '../types/financeTypes';

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
    <div className="space-y-6">
      <div className="animate-fade-in-up flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Categories
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create and manage categories used for transactions and budgets (e.g. Tithe).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(v => !v)}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-[0.97]"
        >
          {showForm ? 'Cancel' : '+ New Category'}
        </button>
      </div>

      {error ? (
        <div className="animate-fade-in-up flex items-start gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-50/60 px-5 py-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-800">Error</p>
            <p className="mt-0.5 text-sm text-rose-700">{error}</p>
          </div>
        </div>
      ) : null}

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 space-y-4 dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tithe"
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Type</span>
              <select
                value={type}
                onChange={(e) => setType(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value={PERSONAL_CATEGORY_TYPE.Expense}>Expense</option>
                <option value={PERSONAL_CATEGORY_TYPE.Income}>Income</option>
              </select>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none"
          >
            {submitting ? 'Creating…' : 'Create Category'}
          </button>
        </form>
      ) : null}

      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Your categories</h2>
            <p className="mt-0.5 text-xs text-slate-400">Used for transactions, budgets and reporting</p>
          </div>

          <div className="flex gap-2">
            {([
              { key: 'expense', label: `Expenses (${expenseCategories.length})` },
              { key: 'income', label: `Income (${incomeCategories.length})` }
            ] as const).map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  tab === t.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl ring-1 ring-slate-200/60">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Name</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">ID</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-4 py-3"><div className="h-3 w-40 rounded bg-slate-100" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-12 rounded bg-slate-100" /></td>
                    <td className="px-4 py-3"><div className="ml-auto h-7 w-20 rounded bg-slate-100" /></td>
                  </tr>
                ))
              ) : activeList.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-14 text-center">
                    <p className="text-sm font-medium text-slate-500">No categories yet</p>
                    <p className="mt-1 text-xs text-slate-400">Create one to start categorizing transactions.</p>
                  </td>
                </tr>
              ) : (
                activeList.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50">
                    <td className="px-4 py-3">
                      {editingId === c.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        <span className="font-semibold text-slate-800">{c.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{c.id}</td>
                    <td className="px-4 py-3 text-right">
                      {editingId === c.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleRename(c.id)}
                            disabled={submitting}
                            className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setEditName('');
                            }}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(c.id);
                            setEditName(c.name);
                          }}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                        >
                          Rename
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
