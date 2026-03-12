import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { createDeal, getDeal, getDeals } from '../api/dealsApi';
import type { CreateDealRequest, DealDto } from '../types/api';
import { toApiClientError } from '../api/apiError';

function statusLabel(status: number) {
  if (status === 1) return 'Active';
  if (status === 2) return 'Closed';
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(amount);
}

function formatRate(rate: number) {
  const pct = rate > 1 ? rate : rate * 100;
  return `${pct.toFixed(2)}%`;
}

export default function DealsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deals, setDeals] = useState<DealDto[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateDealRequest>({
    dealCode: '',
    title: '',
    borrowerName: '',
    loanAmount: 0,
    interestRate: 0,
    tenureMonths: 0
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getDeals();
      setDeals(data);
    } catch (e) {
      setError(toApiClientError(e).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const canSubmit = useMemo(() => {
    return (
      form.dealCode.trim().length > 0 &&
      form.title.trim().length > 0 &&
      form.borrowerName.trim().length > 0 &&
      form.loanAmount > 0 &&
      form.interestRate > 0 &&
      form.tenureMonths > 0 &&
      !saving
    );
  }, [form, saving]);

  function openCreateModal() {
    setFormError(null);
    setForm({
      dealCode: '',
      title: '',
      borrowerName: '',
      loanAmount: 0,
      interestRate: 0,
      tenureMonths: 0
    });
    setCreateOpen(true);
  }

  async function submitCreate() {
    setFormError(null);
    if (!canSubmit) return;

    setSaving(true);
    try {
      const created = await createDeal({
        dealCode: form.dealCode.trim(),
        title: form.title.trim(),
        borrowerName: form.borrowerName.trim(),
        loanAmount: Number(form.loanAmount),
        interestRate: Number(form.interestRate) / 100,
        tenureMonths: Number(form.tenureMonths)
      });

      const full = await getDeal(created.dealId);
      setDeals(prev => [full, ...prev]);
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
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Deals</h1>
          <p className="mt-1 max-w-lg text-sm text-slate-500 dark:text-slate-400">
            A deal is a loan or investment opportunity that investors can fund. Each deal has a borrower, loan amount, interest rate, and tenure.
            Currently {deals.length.toLocaleString()} deal(s).
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-[0.97]"
        >
          + Create Deal
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
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Borrower</th>
                <th className="px-4 py-3 text-right">Loan amount</th>
                <th className="px-4 py-3 text-right">Interest rate</th>
                <th className="px-4 py-3 text-right">Tenure</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : deals.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={6}>
                    No deals found.
                  </td>
                </tr>
              ) : (
                deals.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                      {d.title}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{d.borrowerName}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-50">
                      {formatCurrency(d.loanAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                      {formatRate(d.interestRate)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                      {d.tenureMonths.toLocaleString()} mo
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={d.status} />
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
        title="Create Deal"
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
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 px-4 py-3 dark:border-blue-800/40 dark:from-blue-950/20 dark:to-indigo-950/20">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300">💡 What is a Deal?</p>
            <p className="mt-1 text-[11px] leading-relaxed text-blue-600/90 dark:text-blue-300/80">
              A deal represents a loan or investment opportunity. You set the borrower, loan amount, interest rate, and how long the loan lasts (tenure). Investors then fund it through tranches.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Deal code
              </label>
              <p className="text-[11px] text-slate-400">A short unique identifier for this deal</p>
              <input
                value={form.dealCode}
                onChange={e =>
                  setForm(s => ({ ...s, dealCode: e.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. D-001"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Tenure (months)
              </label>
              <p className="text-[11px] text-slate-400">How long does the loan last?</p>
              <input
                value={form.tenureMonths || ''}
                onChange={e =>
                  setForm(s => ({
                    ...s,
                    tenureMonths: Number(e.target.value)
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. 12"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input
              value={form.title}
              onChange={e => setForm(s => ({ ...s, title: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Deal title"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              Borrower
            </label>
            <p className="text-[11px] text-slate-400">The person or company receiving the loan</p>
            <input
              value={form.borrowerName}
              onChange={e =>
                setForm(s => ({ ...s, borrowerName: e.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Borrower name"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Loan amount (NGN)
              </label>
              <p className="text-[11px] text-slate-400">Total value of the loan</p>
              <input
                value={form.loanAmount || ''}
                onChange={e =>
                  setForm(s => ({ ...s, loanAmount: Number(e.target.value) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. 5000000"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Interest rate (%)
              </label>
              <input
                value={form.interestRate || ''}
                onChange={e =>
                  setForm(s => ({
                    ...s,
                    interestRate: Number(e.target.value)
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. 15"
                inputMode="decimal"
              />
              <div className="text-xs text-slate-500">
                Enter as whole number (e.g. 15 for 15%).
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
