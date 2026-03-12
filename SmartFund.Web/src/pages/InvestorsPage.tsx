import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { createInvestor, getInvestors } from '../api/investorsApi';
import type { CreateInvestorRequest, InvestorDto } from '../types/api';
import { toApiClientError } from '../api/apiError';

function statusLabel(status: number) {
  if (status === 1) return 'Active';
  if (status === 2) return 'Inactive';
  return `Unknown (${status})`;
}

function StatusPill({ status }: { status: number }) {
  const active = status === 1;
  return (
    <span
      className={
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ' +
        (active
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50'
          : 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700')
      }
      title={statusLabel(status)}
    >
      {statusLabel(status)}
    </span>
  );
}

export default function InvestorsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [investors, setInvestors] = useState<InvestorDto[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateInvestorRequest>({
    fullName: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getInvestors();
        if (cancelled) return;
        setInvestors(data);
      } catch (e) {
        if (cancelled) return;
        setError(toApiClientError(e).message);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = useMemo(() => {
    return (
      form.fullName.trim().length > 0 &&
      form.email.trim().length > 0 &&
      !saving
    );
  }, [form.email, form.fullName, saving]);

  function openCreateModal() {
    setFormError(null);
    setForm({ fullName: '', email: '', phone: '' });
    setCreateOpen(true);
  }

  async function submitCreate() {
    setFormError(null);

    if (!canSubmit) return;

    setSaving(true);
    try {
      const created = await createInvestor({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() ? form.phone.trim() : null
      });

      setInvestors(prev => [created, ...prev]);
      setCreateOpen(false);
    } catch (e) {
      setFormError(toApiClientError(e).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Investors</h1>
          <p className="mt-1 max-w-lg text-sm text-slate-500 dark:text-slate-400">
            People who put money into the fund. Each investor can have multiple tranches across different deals.
            Currently {investors.length.toLocaleString()} investor(s) in the system.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-[0.97]"
        >
          + Create Investor
        </button>
      </div>

      {error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : investors.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={4}>
                    No investors found.
                  </td>
                </tr>
              ) : (
                investors.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                      {inv.fullName}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{inv.email}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {inv.phone || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={inv.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={createOpen}
        title="Create Investor"
        onClose={() => (saving ? null : setCreateOpen(false))}
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitCreate()}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={!canSubmit}
            >
              {saving ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {formError ? (
              <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {formError}
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input
              value={form.fullName}
              onChange={e => setForm(s => ({ ...s, fullName: e.target.value }))}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-slate-700"
              placeholder="Full name"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              value={form.email}
              onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-slate-700"
              placeholder="name@example.com"
              type="email"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Phone</label>
            <input
              value={form.phone ?? ''}
              onChange={e => setForm(s => ({ ...s, phone: e.target.value }))}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-slate-700"
              placeholder="Optional"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
