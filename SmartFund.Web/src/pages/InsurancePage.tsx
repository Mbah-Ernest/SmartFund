import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import { fundInsuranceWallet, useInsuranceWallet } from '../api/insuranceApi';
import { getDeals } from '../api/dealsApi';
import { getTranches } from '../api/tranchesApi';
import { getInsuranceBufferReport } from '../api/reportsApi';
import { toApiClientError } from '../api/apiError';
import type { DealDto, InsuranceBufferReportDto, TrancheDto } from '../types/api';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(amount);
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

export default function InsurancePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [report, setReport] = useState<InsuranceBufferReportDto | null>(null);
  const [deals, setDeals] = useState<DealDto[]>([]);
  const [tranches, setTranches] = useState<TrancheDto[]>([]);

  const [fundOpen, setFundOpen] = useState(false);
  const [fundSaving, setFundSaving] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [fundForm, setFundForm] = useState<{
    walletType: number;
    dealId: number | null;
    amount: number;
    bankAccountId: number;
    receivedByUserId: number;
  }>({
    walletType: 1,
    dealId: null,
    amount: 0,
    bankAccountId: 0,
    receivedByUserId: 0
  });

  const [useOpen, setUseOpen] = useState(false);
  const [useSaving, setUseSaving] = useState(false);
  const [useError, setUseError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [useForm, setUseForm] = useState<{
    trancheId: number;
    amount: number;
    usedByUserId: number;
  }>({ trancheId: 0, amount: 0, usedByUserId: 0 });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [r, d, t] = await Promise.all([
        getInsuranceBufferReport(),
        getDeals(),
        getTranches()
      ]);
      setReport(r);
      setDeals(d);
      setTranches(t);
    } catch (e) {
      setError(toApiClientError(e).message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshReport() {
    try {
      const r = await getInsuranceBufferReport();
      setReport(r);
    } catch {
      // keep existing report on refresh failures
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const canFund = useMemo(() => {
    const needsDeal = fundForm.walletType === 2;
    const dealOk = !needsDeal || (fundForm.dealId ?? 0) > 0;

    return (
      dealOk &&
      fundForm.amount > 0 &&
      fundForm.bankAccountId > 0 &&
      fundForm.receivedByUserId > 0 &&
      !fundSaving
    );
  }, [fundForm, fundSaving]);

  const canUse = useMemo(() => {
    return (
      useForm.trancheId > 0 &&
      useForm.amount > 0 &&
      useForm.usedByUserId > 0 &&
      !useSaving
    );
  }, [useForm, useSaving]);

  function openFundModal() {
    setActionSuccess(null);
    setFundError(null);
    setFundForm({
      walletType: 1,
      dealId: null,
      amount: 0,
      bankAccountId: 0,
      receivedByUserId: 0
    });
    setFundOpen(true);
  }

  async function submitFund() {
    setFundError(null);
    setActionSuccess(null);
    if (!canFund) return;

    setFundSaving(true);
    try {
      const result = await fundInsuranceWallet({
        walletType: Number(fundForm.walletType),
        dealId: fundForm.walletType === 2 ? Number(fundForm.dealId) : null,
        amount: Number(fundForm.amount),
        bankAccountId: Number(fundForm.bankAccountId),
        receivedByUserId: Number(fundForm.receivedByUserId)
      });

      setActionSuccess(`Insurance funded. TransactionId: ${result.transactionId}`);
      setFundOpen(false);
      await refreshReport();
    } catch (e) {
      setFundError(toApiClientError(e).message);
    } finally {
      setFundSaving(false);
    }
  }

  function openUseModal() {
    setActionSuccess(null);
    setUseError(null);
    const firstTranche = tranches[0];
    setUseForm({
      trancheId: firstTranche?.id ?? 0,
      amount: 0,
      usedByUserId: 0
    });
    setUseOpen(true);
  }

  async function submitUse() {
    setUseError(null);
    setActionSuccess(null);
    if (!canUse) return;

    setUseSaving(true);
    try {
      const result = await useInsuranceWallet({
        trancheId: Number(useForm.trancheId),
        amount: Number(useForm.amount),
        usedByUserId: Number(useForm.usedByUserId)
      });

      setActionSuccess(`Insurance used. TransactionId: ${result.transactionId}`);
      setUseOpen(false);
      await refreshReport();
    } catch (e) {
      setUseError(toApiClientError(e).message);
    } finally {
      setUseSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Insurance</h1>
          <p className="text-slate-600 dark:text-slate-300">Insurance reserve protecting investors.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openFundModal}
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Fund insurance
          </button>
          <button
            type="button"
            onClick={openUseModal}
            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Use insurance
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {actionSuccess}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Insurance reserve
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {loading ? 'Loading…' : formatCurrency(report?.totalInsuranceReserve ?? 0)}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total exposure
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {loading ? 'Loading…' : formatCurrency(report?.totalExposure ?? 0)}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Coverage ratio
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {loading
              ? 'Loading…'
              : formatPercent(report?.coverageRatio ?? 0)}
          </div>
        </div>
      </div>

      <Modal
        open={fundOpen}
        title="Fund insurance"
        onClose={() => (fundSaving ? null : setFundOpen(false))}
        footer={
          <>
            <button
              type="button"
              onClick={() => setFundOpen(false)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {fundError}
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Wallet</label>
            <select
              value={fundForm.walletType}
              onChange={e =>
                setFundForm(s => {
                  const walletType = Number(e.target.value);
                  return {
                    ...s,
                    walletType,
                    dealId: walletType === 2 ? s.dealId : null
                  };
                })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value={1}>Global</option>
              <option value={2}>Deal-specific</option>
            </select>
          </div>

          {fundForm.walletType === 2 ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Deal</label>
              <select
                value={fundForm.dealId ?? ''}
                onChange={e =>
                  setFundForm(s => ({
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
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Amount</label>
              <input
                value={fundForm.amount || ''}
                onChange={e =>
                  setFundForm(s => ({ ...s, amount: Number(e.target.value) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. 1000000"
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

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              Received by user Id
            </label>
            <input
              value={fundForm.receivedByUserId || ''}
              onChange={e =>
                setFundForm(s => ({
                  ...s,
                  receivedByUserId: Number(e.target.value)
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="User id"
              inputMode="numeric"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={useOpen}
        title="Use insurance"
        onClose={() => (useSaving ? null : setUseOpen(false))}
        footer={
          <>
            <button
              type="button"
              onClick={() => setUseOpen(false)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={useSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitUse()}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={!canUse}
            >
              {useSaving ? 'Using…' : 'Use'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {useError ? (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {useError}
            </div>
          ) : null}

          {tranches.length === 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No tranches available.
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Tranche</label>
            <select
              value={useForm.trancheId || ''}
              onChange={e =>
                setUseForm(s => ({
                  ...s,
                  trancheId: Number(e.target.value)
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              disabled={tranches.length === 0}
            >
              {tranches.map(t => (
                <option key={t.id} value={t.id}>
                  {t.trancheCode}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Amount</label>
              <input
                value={useForm.amount || ''}
                onChange={e =>
                  setUseForm(s => ({ ...s, amount: Number(e.target.value) }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="e.g. 50000"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Used by user Id
              </label>
              <input
                value={useForm.usedByUserId || ''}
                onChange={e =>
                  setUseForm(s => ({
                    ...s,
                    usedByUserId: Number(e.target.value)
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="User id"
                inputMode="numeric"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
