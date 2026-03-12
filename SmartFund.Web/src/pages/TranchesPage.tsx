import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { getDeals } from '../api/dealsApi';
import { getInvestors } from '../api/investorsApi';
import { createTranche, fundTranche, getTranches } from '../api/tranchesApi';
import { toApiClientError } from '../api/apiError';
import type {
  CreateTrancheRequest,
  DealDto,
  InvestorDto,
  TrancheDto
} from '../types/api';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(amount);
}

function toWholePercent(rate: number) {
  return rate > 1 ? rate : rate * 100;
}

function formatRate(rate: number) {
  return `${toWholePercent(rate).toFixed(2)}%`;
}

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function StatusPill({ status }: { status: string }) {
  const normalized = (status || '').toLowerCase();
  const cls =
    normalized === 'active'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50'
      : normalized === 'pending'
        ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/35 dark:text-amber-200 dark:ring-amber-900/50'
        : 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
      title={status}
    >
      {status}
    </span>
  );
}

export default function TranchesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tranches, setTranches] = useState<TrancheDto[]>([]);
  const [deals, setDeals] = useState<DealDto[]>([]);
  const [investors, setInvestors] = useState<InvestorDto[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateTrancheRequest>(() => {
    const today = new Date();
    return {
      investorId: 0,
      dealId: null,
      principal: 0,
      roiType: 1,
      roiRate: 10,
      startDate: toDateInputValue(today),
      maturityDate: toDateInputValue(addMonths(today, 1)),
      payoutType: 1,
      noticeDays: null,
      earlyWithdrawalPolicy: 1
    };
  });

  const [fundOpen, setFundOpen] = useState(false);
  const [fundSaving, setFundSaving] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [fundSuccess, setFundSuccess] = useState<string | null>(null);
  const [fundForm, setFundForm] = useState<{
    trancheId: number;
    amount: number;
    bankAccountId: number;
  }>({ trancheId: 0, amount: 0, bankAccountId: 0 });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [tr, dl, inv] = await Promise.all([
        getTranches(),
        getDeals(),
        getInvestors()
      ]);
      setTranches(tr);
      setDeals(dl);
      setInvestors(inv);
    } catch (e) {
      setError(toApiClientError(e).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const dealById = useMemo(() => {
    const map = new Map<number, DealDto>();
    for (const d of deals) map.set(d.id, d);
    return map;
  }, [deals]);

  const investorById = useMemo(() => {
    const map = new Map<number, InvestorDto>();
    for (const i of investors) map.set(i.id, i);
    return map;
  }, [investors]);

  const selectedDeal = useMemo(() => {
    if (!createForm.dealId) return undefined;
    return dealById.get(createForm.dealId);
  }, [createForm.dealId, dealById]);

  const dealAmountAllocated = useMemo(() => {
    if (!createForm.dealId) return 0;
    return tranches
      .filter(t => t.dealId === createForm.dealId)
      .reduce((sum, t) => sum + t.principal, 0);
  }, [createForm.dealId, tranches]);

  const dealAmountLeft = useMemo(() => {
    if (!selectedDeal) return 0;
    return selectedDeal.loanAmount - dealAmountAllocated;
  }, [selectedDeal, dealAmountAllocated]);

  function monthsBetween(startStr: string, endStr: string): number {
    const s = new Date(startStr);
    const e = new Date(endStr);
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  }

  const constraintWarnings = useMemo(() => {
    if (!selectedDeal) return [];
    const warnings: string[] = [];

    const dealRateWhole = toWholePercent(selectedDeal.interestRate);
    if (createForm.roiRate > dealRateWhole) {
      warnings.push(
        `Tranche ROI rate (${createForm.roiRate.toFixed(2)}%) exceeds the deal interest rate (${dealRateWhole.toFixed(2)}%).`
      );
    }

    const trancheMonths = monthsBetween(createForm.startDate, createForm.maturityDate);
    if (trancheMonths > 0 && trancheMonths < selectedDeal.tenureMonths) {
      warnings.push(
        `Tranche tenure (${trancheMonths} month(s)) is shorter than the deal tenure (${selectedDeal.tenureMonths} months). The investor must be paid out before the deal matures.`
      );
    }

    if (createForm.principal > 0 && createForm.principal > dealAmountLeft) {
      warnings.push(
        `Tranche principal (${formatCurrency(createForm.principal)}) exceeds the deal's remaining capacity (${formatCurrency(dealAmountLeft)} of ${formatCurrency(selectedDeal.loanAmount)}).`
      );
    }

    return warnings;
  }, [selectedDeal, createForm.roiRate, createForm.principal, createForm.startDate, createForm.maturityDate, dealAmountLeft]);

  const canCreate = useMemo(() => {
    const noticeOk =
      createForm.payoutType !== 3 || (createForm.noticeDays ?? 0) > 0;

    return (
      createForm.investorId > 0 &&
      (createForm.dealId ?? 0) > 0 &&
      createForm.principal > 0 &&
      createForm.roiRate >= 0 &&
      createForm.startDate.trim().length > 0 &&
      createForm.maturityDate.trim().length > 0 &&
      noticeOk &&
      !createSaving
    );
  }, [createForm, createSaving]);

  function openCreateModal() {
    const today = new Date();
    setCreateError(null);
    setCreateForm({
      investorId: investors[0]?.id ?? 0,
      dealId: deals[0]?.id ?? null,
      principal: 0,
      roiType: 1,
      roiRate: 10,
      startDate: toDateInputValue(today),
      maturityDate: toDateInputValue(addMonths(today, 1)),
      payoutType: 1,
      noticeDays: null,
      earlyWithdrawalPolicy: 1
    });
    setCreateOpen(true);
  }

  async function submitCreate() {
    setCreateError(null);
    if (!canCreate) return;

    setCreateSaving(true);
    try {
      await createTranche({
        ...createForm,
        investorId: Number(createForm.investorId),
        dealId: Number(createForm.dealId),
        principal: Number(createForm.principal),
        roiType: Number(createForm.roiType),
        roiRate: Number(createForm.roiRate) / 100,
        payoutType: Number(createForm.payoutType),
        noticeDays:
          Number(createForm.payoutType) === 3
            ? Number(createForm.noticeDays)
            : null,
        earlyWithdrawalPolicy: Number(createForm.earlyWithdrawalPolicy)
      });

      await load();
      setCreateOpen(false);
    } catch (e) {
      setCreateError(toApiClientError(e).message);
    } finally {
      setCreateSaving(false);
    }
  }

  const canFund = useMemo(() => {
    return (
      fundForm.trancheId > 0 &&
      fundForm.amount > 0 &&
      fundForm.bankAccountId > 0 &&
      !fundSaving
    );
  }, [fundForm, fundSaving]);

  function openFundModal() {
    setFundError(null);
    setFundSuccess(null);
    const firstTranche = tranches[0];
    setFundForm({
      trancheId: firstTranche?.id ?? 0,
      amount: firstTranche?.principal ?? 0,
      bankAccountId: 0,
    });
    setFundOpen(true);
  }

  async function submitFund() {
    setFundError(null);
    setFundSuccess(null);
    if (!canFund) return;

    setFundSaving(true);
    try {
      const result = await fundTranche(Number(fundForm.trancheId), {
        amount: Number(fundForm.amount),
        bankAccountId: Number(fundForm.bankAccountId)
      });

      setFundSuccess(`Funding posted. TransactionId: ${result.transactionId}`);
      setFundOpen(false);
    } catch (e) {
      setFundError(toApiClientError(e).message);
    } finally {
      setFundSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Tranches</h1>
          <p className="mt-1 max-w-lg text-sm text-slate-500 dark:text-slate-400">
            A tranche is a single funded slice of a deal — one investor's money with its own principal, interest rate, start date, and maturity date.
            Currently {tranches.length.toLocaleString()} tranche(s).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            + Create Tranche
          </button>
          <button
            type="button"
            onClick={openFundModal}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-[0.97]"
          >
            💰 Fund Tranche
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {fundSuccess ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {fundSuccess}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Tranche code</th>
                <th className="px-4 py-3">Deal</th>
                <th className="px-4 py-3">Investor</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : tranches.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={5}>
                    No tranches found.
                  </td>
                </tr>
              ) : (
                tranches.map(t => {
                  const deal = t.dealId ? dealById.get(t.dealId) : undefined;
                  const investor = investorById.get(t.investorId);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                        {t.trancheCode}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {deal ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-900 dark:text-slate-50">
                              {deal.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {deal.dealCode}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {investor?.fullName || (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-50">
                        {formatCurrency(t.principal)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={t.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={createOpen}
        title="Create Tranche"
        onClose={() => (createSaving ? null : setCreateOpen(false))}
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={createSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitCreate()}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={!canCreate}
            >
              {createSaving ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {createError ? (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {createError}
            </div>
          ) : null}

          {investors.length === 0 || deals.length === 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              You need at least one investor and one deal before creating a tranche.
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Deal
              </label>
              <select
                value={createForm.dealId ?? ''}
                onChange={e =>
                  setCreateForm(s => ({
                    ...s,
                    dealId: e.target.value ? Number(e.target.value) : null
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Select a deal…</option>
                {deals.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.dealCode} — {d.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Investor
              </label>
              <select
                value={createForm.investorId || ''}
                onChange={e =>
                  setCreateForm(s => ({
                    ...s,
                    investorId: Number(e.target.value)
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Select an investor…</option>
                {investors.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedDeal ? (
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm dark:border-sky-900/50 dark:bg-sky-950/30">
              <div className="mb-1 font-semibold text-sky-800 dark:text-sky-200">
                📊 Deal ROI Info — {selectedDeal.dealCode}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sky-700 dark:text-sky-300">
                <span>Interest rate:</span>
                <span className="font-medium">{formatRate(selectedDeal.interestRate)}</span>
                <span>Loan amount:</span>
                <span className="font-medium">{formatCurrency(selectedDeal.loanAmount)}</span>
                <span>Already allocated:</span>
                <span className="font-medium">{formatCurrency(dealAmountAllocated)}</span>
                <span>Remaining capacity:</span>
                <span className="font-medium">{formatCurrency(dealAmountLeft)}</span>
                <span>Tenure:</span>
                <span className="font-medium">{selectedDeal.tenureMonths} month(s)</span>
              </div>
            </div>
          ) : null}

          {constraintWarnings.length > 0 ? (
            <div className="space-y-1.5">
              {constraintWarnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                >
                  <span className="mt-0.5 shrink-0">⚠️</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Principal (NGN)
              </label>
              <input
                value={createForm.principal || ''}
                onChange={e =>
                  setCreateForm(s => ({ ...s, principal: Number(e.target.value) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. 250000"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                ROI rate (%)
              </label>
              <input
                value={createForm.roiRate || ''}
                onChange={e =>
                  setCreateForm(s => ({ ...s, roiRate: Number(e.target.value) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. 24"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Start date
              </label>
              <input
                type="date"
                value={createForm.startDate}
                onChange={e =>
                  setCreateForm(s => ({ ...s, startDate: e.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Maturity date
              </label>
              <input
                type="date"
                value={createForm.maturityDate}
                onChange={e =>
                  setCreateForm(s => ({ ...s, maturityDate: e.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                ROI type
              </label>
              <select
                value={createForm.roiType}
                onChange={e =>
                  setCreateForm(s => ({ ...s, roiType: Number(e.target.value) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value={1}>Flat</option>
                <option value={2}>Simple interest</option>
                <option value={3}>Compound interest</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Payout type
              </label>
              <select
                value={createForm.payoutType}
                onChange={e =>
                  setCreateForm(s => {
                    const payoutType = Number(e.target.value);
                    return {
                      ...s,
                      payoutType,
                      noticeDays: payoutType === 3 ? s.noticeDays : null
                    };
                  })
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value={1}>At maturity</option>
                <option value={2}>Periodic</option>
                <option value={3}>On demand (with notice)</option>
              </select>
            </div>
          </div>

          {createForm.payoutType === 3 ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Notice days
              </label>
              <input
                value={createForm.noticeDays ?? ''}
                onChange={e =>
                  setCreateForm(s => ({
                    ...s,
                    noticeDays: e.target.value ? Number(e.target.value) : null
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. 14"
                inputMode="numeric"
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              Early withdrawal policy
            </label>
            <select
              value={createForm.earlyWithdrawalPolicy}
              onChange={e =>
                setCreateForm(s => ({
                  ...s,
                  earlyWithdrawalPolicy: Number(e.target.value)
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value={1}>Not allowed</option>
              <option value={2}>Allowed (lose all ROI)</option>
              <option value={3}>Allowed (pro-rata ROI)</option>
              <option value={4}>Allowed (penalty fee)</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={fundOpen}
        title="Fund Tranche"
        onClose={() => (fundSaving ? null : setFundOpen(false))}
        footer={
          <>
            <button
              type="button"
              onClick={() => setFundOpen(false)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={fundSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitFund()}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={!canFund}
            >
              {fundSaving ? 'Funding…' : 'Fund'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {fundError ? (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {fundError}
            </div>
          ) : null}

          {tranches.length === 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No tranches available to fund.
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Tranche</label>
            <select
              value={fundForm.trancheId || ''}
              onChange={e => {
                const trancheId = Number(e.target.value);
                const selected = tranches.find(t => t.id === trancheId);
                setFundForm(s => ({
                  ...s,
                  trancheId,
                  amount: selected?.principal ?? s.amount
                }));
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              disabled={tranches.length === 0}
            >
              {tranches.map(t => {
                const investor = investorById.get(t.investorId);
                return (
                  <option key={t.id} value={t.id}>
                    {t.trancheCode}
                    {investor ? ` — ${investor.fullName}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Amount</label>
              <input
                value={fundForm.amount || ''}
                onChange={e =>
                  setFundForm(s => ({ ...s, amount: Number(e.target.value) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. 250000"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Bank account Id
              </label>
              <input
                value={fundForm.bankAccountId || ''}
                onChange={e =>
                  setFundForm(s => ({
                    ...s,
                    bankAccountId: Number(e.target.value)
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Ledger account id"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="text-xs text-slate-500">
            The receiver is taken from your login session.
          </div>
        </div>
      </Modal>
    </div>
  );
}
