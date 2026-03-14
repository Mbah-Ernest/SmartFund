import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getBankConnectToken,
  connectBankAccount,
  getConnectedAccounts,
  disconnectBankAccount,
  syncBankAccount,
  getReauthToken,
  type ConnectedBankAccountDto,
} from '../services/personalFinanceApi';

/* ── Mono Connect widget type ───────────────────────────────────────────── */
declare global {
  interface Window {
    Connect: new (config: {
      key: string;
      data?: { customer?: { name?: string; email?: string } };
      onSuccess: (data: { code: string }) => void;
      onClose?: () => void;
    }) => { setup: () => void; open: () => void };
  }
}

const MONO_SCRIPT_URL = 'https://connect.withmono.com/connect.js';
const MAX_ACCOUNTS = 5;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatCurrency(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function maskAccountNumber(n: string) {
  if (n.length <= 4) return n;
  return '•••• ' + n.slice(-4);
}

function formatRelativeTime(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}

function extractErrorMessage(err: unknown): string {
  if (err != null && typeof err === 'object') {
    if ('message' in err) return String((err as { message: string }).message);
  }
  return 'An unexpected error occurred.';
}

/* ── Bank colour palette ─────────────────────────────────────────────────── */
const BANK_COLORS: [RegExp, string][] = [
  [/gtbank|guaranty/i, 'from-orange-500 to-orange-600'],
  [/access/i, 'from-red-500 to-red-600'],
  [/zenith/i, 'from-red-600 to-rose-700'],
  [/uba/i, 'from-rose-600 to-pink-700'],
  [/first bank|fbn/i, 'from-blue-600 to-blue-700'],
  [/fidelity/i, 'from-emerald-500 to-emerald-600'],
  [/sterling/i, 'from-purple-500 to-purple-600'],
  [/union/i, 'from-sky-500 to-sky-600'],
  [/stanbic/i, 'from-blue-500 to-indigo-600'],
  [/polaris/i, 'from-teal-500 to-teal-600'],
  [/fcmb/i, 'from-green-600 to-green-700'],
  [/eco|ecobank/i, 'from-cyan-600 to-cyan-700'],
  [/kuda/i, 'from-purple-600 to-violet-700'],
];

function bankGradient(bankName: string): string {
  for (const [pattern, cls] of BANK_COLORS) {
    if (pattern.test(bankName)) return cls;
  }
  return 'from-slate-600 to-slate-700';
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function BankConnectionPage() {
  const [accounts, setAccounts] = useState<ConnectedBankAccountDto[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null);
  const [reauthingId, setReauthingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  /* ── Load connected accounts ─────────────────────────────────────────── */
  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const data = await getConnectedAccounts();
      setAccounts(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  /* ── Ensure Mono script loaded ───────────────────────────────────────── */
  useEffect(() => {
    if (document.getElementById('mono-connect-js')) {
      scriptLoadedRef.current = true;
      return;
    }
    const script = document.createElement('script');
    script.id = 'mono-connect-js';
    script.src = MONO_SCRIPT_URL;
    script.async = true;
    script.onload = () => { scriptLoadedRef.current = true; };
    document.head.appendChild(script);
  }, []);

  /* ── Open connect widget (fresh token per click) ─────────────────────── */
  async function openConnectWidget() {
    if (accounts.length >= MAX_ACCOUNTS) {
      setError(`Maximum ${MAX_ACCOUNTS} accounts allowed.`);
      return;
    }
    if (!window.Connect) {
      setError('Mono Connect is still loading — please try again in a moment.');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const token = await getBankConnectToken();
      const instance = new window.Connect({
        key: token,
        onSuccess: async (data: { code: string }) => {
          try {
            const account = await connectBankAccount(data.code);
            setAccounts(prev => {
              const exists = prev.some(a => a.id === account.id);
              return exists
                ? prev.map(a => (a.id === account.id ? account : a))
                : [...prev, account];
            });
            setSuccessMsg(`${account.bankName} connected! Initial sync starting in the background.`);
            setTimeout(() => setSuccessMsg(null), 6000);
          } catch (err) {
            setError(extractErrorMessage(err));
          } finally {
            setConnecting(false);
          }
        },
        onClose: () => setConnecting(false),
      });
      instance.setup();
      instance.open();
    } catch (err) {
      setError(extractErrorMessage(err));
      setConnecting(false);
    }
  }

  /* ── Manual sync ─────────────────────────────────────────────────────── */
  async function handleSync(account: ConnectedBankAccountDto) {
    setSyncingId(account.id);
    setError(null);
    try {
      const updated = await syncBankAccount(account.id);
      setAccounts(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      setSuccessMsg(`${account.bankName} synced — ${updated.totalTransactionsSynced} total transactions.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSyncingId(null);
    }
  }

  /* ── Disconnect ──────────────────────────────────────────────────────── */
  async function handleDisconnect(account: ConnectedBankAccountDto) {
    if (!confirm(`Disconnect ${account.bankName}? Your transaction history will be kept.`)) return;
    setDisconnectingId(account.id);
    try {
      await disconnectBankAccount(account.id);
      setAccounts(prev => prev.filter(a => a.id !== account.id));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setDisconnectingId(null);
    }
  }

  /* ── Reauth ──────────────────────────────────────────────────────────── */
  async function handleReauth(account: ConnectedBankAccountDto) {
    if (!window.Connect) {
      setError('Mono Connect is still loading — please try again in a moment.');
      return;
    }
    setReauthingId(account.id);
    setError(null);
    try {
      const token = await getReauthToken(account.id);
      const instance = new window.Connect({
        key: token,
        onSuccess: async () => {
          await loadAccounts();
          setSuccessMsg(`${account.bankName} reconnected successfully.`);
          setTimeout(() => setSuccessMsg(null), 4000);
          setReauthingId(null);
        },
        onClose: () => setReauthingId(null),
      });
      instance.setup();
      instance.open();
    } catch (err) {
      setError(extractErrorMessage(err));
      setReauthingId(null);
    }
  }

  const atLimit = accounts.length >= MAX_ACCOUNTS;
  const reauthCount = accounts.filter(a => a.syncStatus === 'ReauthRequired').length;

  /* ──────────────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="animate-fade-in-up flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Bank Connections
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {accounts.length === 0
              ? 'Connect up to 5 bank accounts via Mono to sync transactions automatically.'
              : `${accounts.length} of ${MAX_ACCOUNTS} accounts connected · Auto-syncs every 15 minutes`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/finance/bank/inbox"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <InboxIcon className="h-4 w-4" />
            Review Inbox
          </Link>
          <button
            type="button"
            onClick={openConnectWidget}
            disabled={connecting || atLimit}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0 ${
              atLimit
                ? 'bg-slate-400'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30'
            }`}
          >
            {connecting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Connecting…
              </>
            ) : atLimit ? (
              'Limit Reached'
            ) : accounts.length === 0 ? (
              <>
                <BankIcon className="h-4 w-4" />
                Connect Bank Account
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4" />
                Connect Another Bank
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reauth warning */}
      {reauthCount > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/60 px-5 py-4 dark:border-amber-800/50 dark:from-amber-950/30 dark:to-amber-950/20">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
            <ExclamationIcon />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Reconnection Required</p>
            <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
              {reauthCount === 1 ? '1 account needs' : `${reauthCount} accounts need`} to be reconnected.
              Click <strong>Reconnect</strong> on the affected account below.
            </p>
          </div>
        </div>
      )}

      {/* Success banner */}
      {successMsg && (
        <div className="animate-fade-in-up flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/60 px-5 py-4 shadow-sm dark:border-emerald-800/50 dark:from-emerald-950/30 dark:to-emerald-950/20">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
            <CheckCircleIcon />
          </div>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{successMsg}</p>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="ml-auto shrink-0 rounded-lg p-1 text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60"
            aria-label="Dismiss"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="animate-fade-in-up flex items-start gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-50/60 px-5 py-4 shadow-sm dark:border-rose-900/50 dark:from-rose-950/30 dark:to-rose-950/20">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400">
            <ExclamationIcon />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Error</p>
            <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto shrink-0 rounded-lg p-1 text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60"
            aria-label="Dismiss"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Connected Accounts ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400">
            <BankIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Connected Accounts</h2>
            <p className="text-xs text-slate-400">
              {accounts.length === 0 ? 'No accounts connected yet.' : `${accounts.length} / ${MAX_ACCOUNTS} connected`}
            </p>
          </div>
        </div>

        {accountsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2].map(i => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-50 dark:bg-slate-800/50" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-14 dark:border-slate-700">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
              <BankIcon className="h-7 w-7 text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No bank accounts connected</p>
              <p className="mt-1 text-xs text-slate-400">
                Connect your first account and transactions will start syncing automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={openConnectWidget}
              disabled={connecting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-60"
            >
              <BankIcon className="h-4 w-4" />
              Connect Your First Bank
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map(account => {
              const gradient = bankGradient(account.bankName);
              const isSyncing = syncingId === account.id;
              const isDisconnecting = disconnectingId === account.id;
              const isReathing = reauthingId === account.id;
              const needsReauth = account.syncStatus === 'ReauthRequired';
              const hasError = account.syncStatus === 'Error';

              return (
                <div
                  key={account.id}
                  className={`relative overflow-hidden rounded-2xl ring-1 transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md ${
                    needsReauth
                      ? 'ring-amber-300 dark:ring-amber-700'
                      : hasError
                      ? 'ring-rose-300 dark:ring-rose-700'
                      : 'ring-slate-200/80 hover:-translate-y-0.5 dark:ring-slate-700'
                  }`}
                >
                  {/* Card gradient top */}
                  <div className={`bg-gradient-to-br ${gradient} p-5`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold uppercase tracking-wider text-white/70">
                          {account.bankName}
                        </p>
                        <p className="mt-1 font-mono text-base font-semibold text-white">
                          {maskAccountNumber(account.accountNumber)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-white/80">{account.accountName}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          needsReauth
                            ? 'bg-amber-400/90 text-amber-900'
                            : hasError
                            ? 'bg-rose-400/90 text-rose-900'
                            : 'bg-white/20 text-white/90'
                        }`}
                      >
                        {needsReauth ? 'Reauth' : hasError ? 'Error' : 'Active'}
                      </span>
                    </div>
                    <div className="mt-4 border-t border-white/20 pt-3">
                      <p className="text-[11px] font-medium text-white/60">Balance</p>
                      <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-white">
                        {formatCurrency(account.balanceNaira, account.currency)}
                      </p>
                    </div>
                  </div>

                  {/* Card bottom actions */}
                  <div className="flex items-center justify-between gap-2 bg-white px-4 py-3 dark:bg-slate-800/80">
                    {needsReauth ? (
                      <>
                        <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          Reconnection required
                        </p>
                        <button
                          type="button"
                          onClick={() => handleReauth(account)}
                          disabled={isReathing}
                          className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200 disabled:opacity-60 dark:bg-amber-900/30 dark:text-amber-400"
                        >
                          {isReathing && (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-amber-700" />
                          )}
                          Reconnect
                        </button>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-[11px] text-slate-400">
                            Synced {formatRelativeTime(account.lastSyncedAtUtc)}
                          </p>
                          {hasError && account.lastSyncError && (
                            <p
                              className="mt-0.5 max-w-[160px] truncate text-[10px] text-rose-500"
                              title={account.lastSyncError}
                            >
                              {account.lastSyncError}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSync(account)}
                            disabled={isSyncing}
                            title="Sync now"
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                            aria-label="Sync"
                          >
                            <RefreshIcon className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDisconnect(account)}
                            disabled={isDisconnecting}
                            title="Disconnect"
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                            aria-label="Disconnect"
                          >
                            {isDisconnecting ? (
                              <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                            ) : (
                              <TrashIcon className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add another placeholder */}
            {!atLimit && accounts.length > 0 && (
              <button
                type="button"
                onClick={openConnectWidget}
                disabled={connecting}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-10 text-slate-400 transition-all hover:border-blue-300 hover:text-blue-500 hover:-translate-y-0.5 disabled:opacity-50 dark:border-slate-700 dark:hover:border-blue-700"
              >
                {connecting ? (
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
                ) : (
                  <PlusCircleIcon className="h-7 w-7" />
                )}
                <span className="text-xs font-semibold">Connect Another Bank</span>
                <span className="text-[11px] text-slate-400">
                  {MAX_ACCOUNTS - accounts.length} slot{MAX_ACCOUNTS - accounts.length !== 1 ? 's' : ''} remaining
                </span>
              </button>
            )}
          </div>
        )}

        {atLimit && (
          <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <LockIcon className="h-3.5 w-3.5" />
            Maximum of {MAX_ACCOUNTS} accounts reached. Disconnect one to add another.
          </p>
        )}
      </div>

      {/* ── Quick-navigation cards ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/finance/bank/inbox"
          className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/60 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-950/40 dark:text-orange-400">
            <InboxIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Review Inbox</p>
            <p className="text-xs text-slate-400">Categorize pending transactions</p>
          </div>
        </Link>

        <Link
          to="/finance/bank/rules"
          className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/60 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500 dark:bg-violet-950/40 dark:text-violet-400">
            <RulesIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Categorization Rules</p>
            <p className="text-xs text-slate-400">Auto-post matching transactions</p>
          </div>
        </Link>

        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/60 shadow-sm dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <ClockIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Auto-Sync</p>
            <p className="text-xs text-slate-400">Background sync every 15 min</p>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────────── */
function BankIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l9 4v2H3V6l9-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8v10M9 8v10M15 8v10M19 8v10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18h18v2H3v-2z" />
    </svg>
  );
}

function InboxIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12l2-7h16l2 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h4l2 3h8l2-3h4v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-7z" />
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

function ClockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PlusIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
    </svg>
  );
}

function PlusCircleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m-3-3h6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
  );
}

function RefreshIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 9a8 8 0 0114.93-2M20 15a8 8 0 01-14.93 2" />
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

function LockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 018 0v4M5 11h14v10H5V11z" />
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
