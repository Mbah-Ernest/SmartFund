import { useCallback, useEffect, useState } from 'react';
import Modal from '../../../components/Modal';
import { getTranches } from '../../../api/tranchesApi';
import {
  getWallets,
  recordInvestmentContribution
} from '../services/personalFinanceApi';
import type { TrancheDto } from '../../../types/api';
import type { PersonalWalletDto } from '../types/financeTypes';

type InvestFromPersonalFundsModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type Step = 'form' | 'confirm' | 'success';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(n);
}

export default function InvestFromPersonalFundsModal({
  open,
  onClose,
  onSuccess
}: InvestFromPersonalFundsModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tranches, setTranches] = useState<TrancheDto[]>([]);
  const [wallets, setWallets] = useState<PersonalWalletDto[]>([]);

  const [trancheId, setTrancheId] = useState<number>(0);
  const [walletId, setWalletId] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const [resultTxId, setResultTxId] = useState<number | null>(null);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, w] = await Promise.all([getTranches(), getWallets()]);
      setTranches(t);
      setWallets(w);
      if (t.length > 0) setTrancheId(t[0].id);
      if (w.length > 0) setWalletId(w[0].id);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load options.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setStep('form');
      setError(null);
      setAmount('');
      setDescription('');
      setResultTxId(null);
      setSubmitting(false);
      loadOptions();
    }
  }, [open, loadOptions]);

  const selectedTranche = tranches.find((t) => t.id === trancheId);
  const selectedWallet = wallets.find((w) => w.id === walletId);
  const parsedAmount = parseFloat(amount);
  const isValid =
    trancheId > 0 && walletId > 0 && !isNaN(parsedAmount) && parsedAmount > 0;

  function handleReview() {
    setError(null);
    if (!isValid) {
      setError('Please fill in all fields with valid values.');
      return;
    }
    setStep('confirm');
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await recordInvestmentContribution({
        walletId,
        trancheId,
        amount: parsedAmount,
        description: description.trim() || undefined
      });
      setResultTxId(result.ledgerTransactionId);
      setStep('success');
      onSuccess();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Investment failed.'
      );
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    onClose();
  }

  /* ── Render ── */

  if (step === 'success') {
    return (
      <Modal open={open} title="Investment Complete" onClose={handleDone}>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-4 ring-emerald-100">
            <svg
              className="h-8 w-8 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(parsedAmount)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Successfully invested into{' '}
              <span className="font-semibold text-slate-700">
                {selectedTranche?.trancheCode ?? `Tranche #${trancheId}`}
              </span>{' '}
              from{' '}
              <span className="font-semibold text-slate-700">
                {selectedWallet?.name ?? 'your wallet'}
              </span>
            </p>
            {resultTxId ? (
              <p className="mt-2 text-xs text-slate-400">
                Ledger Transaction #{resultTxId}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleDone}
            className="mt-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  if (step === 'confirm') {
    return (
      <Modal
        open={open}
        title="Confirm Investment"
        onClose={() => setStep('form')}
        footer={
          <>
            <button
              type="button"
              onClick={() => setStep('form')}
              disabled={submitting}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:shadow-none"
            >
              {submitting ? 'Processing…' : 'Confirm Investment'}
            </button>
          </>
        }
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Please review the details below before confirming.
          </p>

          <div className="rounded-xl bg-slate-50 p-4 space-y-3">
            <Row label="From Wallet" value={selectedWallet?.name ?? '—'} />
            <Row
              label="To Tranche"
              value={
                selectedTranche
                  ? `${selectedTranche.trancheCode} (${formatCurrency(selectedTranche.principal)})`
                  : '—'
              }
            />
            <Row
              label="Amount"
              value={formatCurrency(parsedAmount)}
              bold
            />
            {description.trim() ? (
              <Row label="Note" value={description.trim()} />
            ) : null}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
            <p className="text-xs font-medium text-blue-700">
              This will debit your personal wallet and credit the tranche
              liability account in a single atomic ledger transaction.
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  /* step === 'form' */
  return (
    <Modal
      open={open}
      title="Invest From Personal Funds"
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={handleReview}
          disabled={loading || !isValid}
          className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:shadow-none"
        >
          Review Investment
        </button>
      }
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 rounded bg-slate-100" />
              <div className="relative h-10 overflow-hidden rounded-lg bg-slate-100">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {tranches.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No tranches available. Create a tranche in the Investment module
              first.
            </div>
          ) : null}

          {wallets.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No personal wallets found. Create a wallet first.
            </div>
          ) : null}

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              Select Tranche
            </span>
            <select
              value={trancheId}
              onChange={(e) => setTrancheId(Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            >
              {tranches.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.trancheCode} — {formatCurrency(t.principal)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              From Wallet
            </span>
            <select
              value={walletId}
              onChange={(e) => setWalletId(Number(e.target.value))}
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.currency})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              Amount
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm tabular-nums transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-600">
              Description{' '}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly contribution"
              className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
          </label>
        </div>
      )}
    </Modal>
  );
}

/* ── Summary row helper ── */

function Row(props: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-500">{props.label}</span>
      <span
        className={`text-sm tabular-nums ${
          props.bold
            ? 'font-bold text-slate-900'
            : 'font-medium text-slate-700'
        }`}
      >
        {props.value}
      </span>
    </div>
  );
}
