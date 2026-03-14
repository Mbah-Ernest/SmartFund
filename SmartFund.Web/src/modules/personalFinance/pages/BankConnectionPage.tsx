import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../api/axios';

/* ── Mono Connect widget type (loaded dynamically via CDN script) ─────────── */
declare global {
  interface Window {
    Connect: new (config: {
      key: string;
      data: { customer: { name: string; email: string; id?: string } };
      onSuccess: (data: { code: string }) => void;
      onClose?: () => void;
    }) => { setup: () => void; open: () => void };
  }
}

const MONO_SCRIPT_URL = 'https://connect.withmono.com/connect.js';
const SESSION_PK = 'mono_test_pk';
const SESSION_SK = 'mono_test_sk';
const SESSION_CUSTOMER_NAME = 'mono_customer_name';
const SESSION_CUSTOMER_EMAIL = 'mono_customer_email';
const MAX_ACCOUNTS = 5;

/* ── Domain types ─────────────────────────────────────────────────────────── */
interface StoredAccount {
  id: number;
  monoAccountId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  currency: string;
  lastKnownBalanceKobo: number;
  lastSyncedAtUtc: string;
  connectedAtUtc: string;
}

interface MonoTransaction {
  _id: string;
  amount: number;
  date: string;
  narration: string;
  type: 'debit' | 'credit';
  balance: number;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function formatCurrency(amountKobo: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amountKobo / 100);
}

function maskAccountNumber(n: string) {
  if (n.length <= 4) return n;
  return '•••• ' + n.slice(-4);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatRelativeTime(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

function extractErrorMessage(err: unknown): string {
  if (err != null && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as {
      response?: {
        data?: {
          message?: string;
          error?: string;
          detail?: string;
          title?: string;
        };
      };
    };
    const msg =
      axiosErr.response?.data?.message ??
      axiosErr.response?.data?.error ??
      axiosErr.response?.data?.detail ??
      axiosErr.response?.data?.title;
    if (msg) return String(msg);
  }
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}

/* ── Bank colour palette (maps bank name fragments to a colour slot) ─────── */
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
];

function bankGradient(bankName: string): string {
  for (const [pattern, cls] of BANK_COLORS) {
    if (pattern.test(bankName)) return cls;
  }
  return 'from-slate-600 to-slate-700';
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function BankConnectionPage() {
  /* Config */
  const [publicKey, setPublicKey] = useState(() => sessionStorage.getItem(SESSION_PK) ?? '');
  const [secretKey, setSecretKey] = useState(() => sessionStorage.getItem(SESSION_SK) ?? '');
  const [customerName, setCustomerName] = useState(() => sessionStorage.getItem(SESSION_CUSTOMER_NAME) ?? '');
  const [customerEmail, setCustomerEmail] = useState(() => sessionStorage.getItem(SESSION_CUSTOMER_EMAIL) ?? '');
  const [showConfig, setShowConfig] = useState(!sessionStorage.getItem(SESSION_PK));
  const [configDirty, setConfigDirty] = useState(false);

  /* Widget */
  const connectRef = useRef<{ setup: () => void; open: () => void } | null>(null);
  const [connecting, setConnecting] = useState(false);

  /* Stored accounts (from DB) */
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  /* Sync balance */
  const [syncingId, setSyncingId] = useState<number | null>(null);

  /* Disconnect */
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null);

  /* Transactions */
  const [transactions, setTransactions] = useState<MonoTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  /* Global error / success */
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /* ── Load accounts from DB ───────────────────────────────────────────────── */
  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const res = await api.get<StoredAccount[]>('/mono-test/connected-accounts');
      setAccounts(res.data ?? []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  /* ── Mono Connect success handler ────────────────────────────────────────── */
  const handleMonoSuccess = useCallback(
    async (data: { code: string }) => {
      setError(null);
      setConnecting(true);

      const sk = sessionStorage.getItem(SESSION_SK) ?? '';
      const skHeader = sk ? { 'X-Mono-Secret-Key': sk } : {};

      try {
        /* 1. Exchange code → account ID */
        const authRes = await api.post<{ id: string }>(
          '/mono-test/exchange',
          { code: data.code },
          { headers: skHeader }
        );
        const monoAccountId = authRes.data.id;

        /* 2. Fetch account details */
        const accountRes = await api.get<{
          account: {
            name: string;
            accountNumber: string;
            balance: number;
            currency: string;
            institution: { name: string };
            type: string;
          };
        }>(`/mono-test/accounts/${monoAccountId}`, { headers: skHeader });
        const a = accountRes.data.account;

        /* 3. Save to DB (upsert) */
        await api.post('/mono-test/connected-accounts', {
          monoAccountId,
          bankName: a.institution?.name ?? 'Bank',
          accountNumber: a.accountNumber ?? '',
          accountName: a.name ?? '',
          accountType: a.type ?? '',
          currency: a.currency ?? 'NGN',
          balanceKobo: Math.round(a.balance ?? 0),
        });

        await loadAccounts();
        setSuccessMsg(`${a.institution?.name ?? 'Bank account'} connected successfully.`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } catch (err: unknown) {
        setError(extractErrorMessage(err));
      } finally {
        setConnecting(false);
      }
    },
    [loadAccounts]
  );

  /* ── Init Connect widget ─────────────────────────────────────────────────── */
  const initConnect = useCallback(() => {
    const pk = sessionStorage.getItem(SESSION_PK) ?? publicKey.trim();
    const name = sessionStorage.getItem(SESSION_CUSTOMER_NAME) ?? customerName.trim();
    const email = sessionStorage.getItem(SESSION_CUSTOMER_EMAIL) ?? customerEmail.trim();
    if (!pk || !name || !email || !window.Connect) return;

    const instance = new window.Connect({
      key: pk,
      data: { customer: { name, email } },
      onSuccess: handleMonoSuccess,
      onClose: () => setConnecting(false),
    });
    instance.setup();
    connectRef.current = instance;
  }, [publicKey, customerName, customerEmail, handleMonoSuccess]);

  /* ── Load Mono script ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (document.getElementById('mono-connect-js')) {
      if (window.Connect) initConnect();
      return;
    }
    const script = document.createElement('script');
    script.id = 'mono-connect-js';
    script.src = MONO_SCRIPT_URL;
    script.async = true;
    script.onload = () => initConnect();
    document.head.appendChild(script);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Save config ─────────────────────────────────────────────────────────── */
  function saveConfig() {
    const pk = publicKey.trim();
    const sk = secretKey.trim();
    const name = customerName.trim();
    const email = customerEmail.trim();
    if (!pk) { setError('Public key is required.'); return; }
    if (!name) { setError('Customer name is required.'); return; }
    if (!email) { setError('Customer email is required.'); return; }
    sessionStorage.setItem(SESSION_PK, pk);
    sessionStorage.setItem(SESSION_SK, sk);
    sessionStorage.setItem(SESSION_CUSTOMER_NAME, name);
    sessionStorage.setItem(SESSION_CUSTOMER_EMAIL, email);
    setPublicKey(pk); setSecretKey(sk); setCustomerName(name); setCustomerEmail(email);
    setShowConfig(false); setConfigDirty(false); setError(null);
    if (window.Connect) initConnect();
  }

  /* ── Open widget ─────────────────────────────────────────────────────────── */
  function openWidget() {
    if (accounts.length >= MAX_ACCOUNTS) {
      setError(`You can connect up to ${MAX_ACCOUNTS} bank accounts.`);
      return;
    }
    const pk = sessionStorage.getItem(SESSION_PK) ?? publicKey.trim();
    const name = sessionStorage.getItem(SESSION_CUSTOMER_NAME) ?? customerName.trim();
    const email = sessionStorage.getItem(SESSION_CUSTOMER_EMAIL) ?? customerEmail.trim();
    if (!pk || !name || !email) {
      setError('Please save your Mono keys and customer details first.');
      setShowConfig(true);
      return;
    }
    if (!window.Connect) {
      setError('Mono Connect script is still loading — please try again in a moment.');
      return;
    }
    initConnect();
    setError(null);
    connectRef.current?.open();
  }

  /* ── Sync balance ────────────────────────────────────────────────────────── */
  async function syncBalance(account: StoredAccount) {
    const sk = sessionStorage.getItem(SESSION_SK) ?? '';
    if (!sk) {
      setError('Secret key required to sync balance. Please configure your keys.');
      setShowConfig(true);
      return;
    }
    setSyncingId(account.id);
    try {
      const res = await api.post<StoredAccount>(
        `/mono-test/connected-accounts/${account.id}/sync-balance`,
        {},
        { headers: { 'X-Mono-Secret-Key': sk } }
      );
      setAccounts(prev => prev.map(a => (a.id === account.id ? res.data : a)));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSyncingId(null);
    }
  }

  /* ── Disconnect account ──────────────────────────────────────────────────── */
  async function disconnectAccount(account: StoredAccount) {
    setDisconnectingId(account.id);
    try {
      await api.delete(`/mono-test/connected-accounts/${account.id}`);
      setAccounts(prev => prev.filter(a => a.id !== account.id));
      if (selectedId === account.id) {
        setSelectedId(null);
        setTransactions([]);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setDisconnectingId(null);
    }
  }

  /* ── Load transactions ───────────────────────────────────────────────────── */
  const loadTransactions = useCallback(async (monoAccountId: string) => {
    const sk = sessionStorage.getItem(SESSION_SK) ?? '';
    if (!sk) {
      setTxError('Secret key required to load transactions. Please configure your keys.');
      return;
    }
    setTxLoading(true);
    setTxError(null);
    setTransactions([]);
    try {
      const res = await api.get<{ data: MonoTransaction[] }>(
        `/mono-test/accounts/${monoAccountId}/transactions`,
        { headers: { 'X-Mono-Secret-Key': sk } }
      );
      setTransactions(res.data.data ?? []);
    } catch (err: unknown) {
      setTxError(extractErrorMessage(err));
    } finally {
      setTxLoading(false);
    }
  }, []);

  function selectAccount(account: StoredAccount) {
    setSelectedId(account.id);
    loadTransactions(account.monoAccountId);
  }

  const selectedAccount = accounts.find(a => a.id === selectedId) ?? null;
  const atLimit = accounts.length >= MAX_ACCOUNTS;

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="animate-fade-in-up flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              Bank Connections
            </h1>
            <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              Mono · Test Mode
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {accounts.length === 0
              ? 'Connect up to 5 bank accounts via Mono to view balances and transactions.'
              : `${accounts.length} of ${MAX_ACCOUNTS} accounts connected. Connections persist between sessions.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowConfig(v => !v); setError(null); }}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:-translate-y-0.5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <CogIcon />
          {showConfig ? 'Hide Config' : 'Configure Keys'}
        </button>
      </div>

      {/* ── Success banner ──────────────────────────────────────────────── */}
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

      {/* ── Error banner ────────────────────────────────────────────────── */}
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

      {/* ── Config panel ────────────────────────────────────────────────── */}
      {showConfig && (
        <div className="animate-fade-in-up rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400">
              <KeyIcon />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Mono API Keys</h2>
              <p className="text-xs text-slate-400">
                Find your test keys in the{' '}
                <a
                  href="https://app.withmono.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
                >
                  Mono developer dashboard
                </a>
                . Keys are stored in <strong>sessionStorage</strong> only.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Public Key', value: publicKey, setter: setPublicKey, type: 'text', placeholder: 'test_pk_…', hint: 'Opens the Connect widget.' },
              { label: 'Secret Key', value: secretKey, setter: setSecretKey, type: 'password', placeholder: 'test_sk_…', hint: 'Needed for live API calls (balance, transactions).' },
              { label: 'Customer Name', value: customerName, setter: setCustomerName, type: 'text', placeholder: 'e.g. John Doe', hint: 'Required by Mono Connect.' },
              { label: 'Customer Email', value: customerEmail, setter: setCustomerEmail, type: 'email', placeholder: 'e.g. john@example.com', hint: 'Required by Mono Connect.' },
            ].map(({ label, value, setter, type, placeholder, hint }) => (
              <label key={label} className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
                <input
                  type={type}
                  value={value}
                  onChange={e => { setter(e.target.value); setConfigDirty(true); }}
                  placeholder={placeholder}
                  spellCheck={false}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={saveConfig}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-[0.97]"
            >
              Save Keys
            </button>
            {!configDirty && sessionStorage.getItem(SESSION_PK) && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircleIcon />
                Saved this session
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Test-mode notice ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-50/60 px-5 py-4 dark:border-amber-800/50 dark:from-amber-950/30 dark:to-amber-950/20">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
          <BeakerIcon />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Developer Test Environment</p>
          <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
            Use Mono test credentials (
            <code className="rounded bg-amber-100 px-1 font-mono text-xs dark:bg-amber-900/60">user: testmono</code>{' '}
            <code className="rounded bg-amber-100 px-1 font-mono text-xs dark:bg-amber-900/60">pass: pass</code>
            ) inside the widget. Account data is saved to the database and persists between sessions.
          </p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Connected Accounts                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">

        {/* Section header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400">
              <WalletIcon />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Connected Accounts</h2>
              <p className="text-xs text-slate-400">
                {accounts.length === 0
                  ? 'No accounts connected yet.'
                  : `${accounts.length} / ${MAX_ACCOUNTS} · Click an account to view transactions.`}
              </p>
            </div>
          </div>

          {/* Connect button */}
          <button
            type="button"
            onClick={openWidget}
            disabled={connecting || atLimit}
            title={atLimit ? `Maximum of ${MAX_ACCOUNTS} accounts reached` : undefined}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:translate-y-0 ${
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
              <>
                <LockIcon />
                Limit Reached
              </>
            ) : accounts.length === 0 ? (
              <>
                <BankIcon />
                Connect Bank Account
              </>
            ) : (
              <>
                <PlusIcon />
                Connect Another Bank
              </>
            )}
          </button>
        </div>

        {/* Account cards */}
        <div className="mt-5">
          {accountsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map(i => (
                <div key={i} className="h-44 overflow-hidden rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-slate-700">
                  <div className="space-y-3">
                    <Shimmer className="h-3 w-28" />
                    <Shimmer className="h-5 w-36" />
                    <Shimmer className="h-3 w-20" />
                    <div className="pt-2">
                      <Shimmer className="h-8 w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-14 dark:border-slate-700">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
                <BankIcon className="h-7 w-7 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No bank accounts connected</p>
                <p className="mt-1 text-xs text-slate-400">
                  Click "Connect Bank Account" above and authenticate with Mono.<br />
                  Your accounts will persist between sessions.
                </p>
              </div>
              <button
                type="button"
                onClick={openWidget}
                disabled={connecting}
                className="mt-1 flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-60"
              >
                <BankIcon />
                Connect Your First Bank
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map(account => {
                const isSelected = account.id === selectedId;
                const isSyncing = syncingId === account.id;
                const isDisconnecting = disconnectingId === account.id;
                const gradient = bankGradient(account.bankName);

                return (
                  <div
                    key={account.id}
                    className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                      isSelected
                        ? 'ring-2 ring-blue-500 ring-offset-2 shadow-xl shadow-blue-500/20'
                        : 'ring-1 ring-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.12)] hover:-translate-y-0.5 dark:ring-slate-700'
                    }`}
                  >
                    {/* Card top — coloured gradient */}
                    <button
                      type="button"
                      onClick={() => selectAccount(account)}
                      className={`w-full bg-gradient-to-br ${gradient} p-5 text-left`}
                    >
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
                        <span className="shrink-0 rounded-lg bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase text-white/90">
                          {account.accountType || 'Account'}
                        </span>
                      </div>

                      <div className="mt-4 border-t border-white/20 pt-3">
                        <p className="text-[11px] font-medium text-white/60">Balance</p>
                        <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-white">
                          {formatCurrency(account.lastKnownBalanceKobo, account.currency)}
                        </p>
                      </div>
                    </button>

                    {/* Card bottom — actions */}
                    <div className="flex items-center justify-between gap-2 bg-white px-4 py-3 dark:bg-slate-800/80">
                      <p className="text-[11px] text-slate-400">
                        Synced {formatRelativeTime(account.lastSyncedAtUtc)}
                      </p>
                      <div className="flex items-center gap-1">
                        {/* Sync balance */}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); syncBalance(account); }}
                          disabled={isSyncing}
                          title="Sync balance (requires secret key)"
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                          aria-label="Sync balance"
                        >
                          <RefreshIcon className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        </button>
                        {/* Disconnect */}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); disconnectAccount(account); }}
                          disabled={isDisconnecting}
                          title="Disconnect this account"
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                          aria-label="Disconnect account"
                        >
                          {isDisconnecting
                            ? <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                            : <TrashIcon className="h-3.5 w-3.5" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
                    )}
                  </div>
                );
              })}

              {/* "Add another" placeholder if under limit */}
              {!atLimit && accounts.length > 0 && (
                <button
                  type="button"
                  onClick={openWidget}
                  disabled={connecting}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-10 text-slate-400 transition-all hover:border-blue-300 hover:text-blue-500 hover:-translate-y-0.5 disabled:opacity-50 dark:border-slate-700 dark:hover:border-blue-700"
                >
                  {connecting
                    ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
                    : <PlusCircleIcon className="h-7 w-7" />
                  }
                  <span className="text-xs font-semibold">Connect Another Bank</span>
                  <span className="text-[11px] text-slate-400">{MAX_ACCOUNTS - accounts.length} slot{MAX_ACCOUNTS - accounts.length !== 1 ? 's' : ''} remaining</span>
                </button>
              )}
            </div>
          )}

          {/* Limit reached message */}
          {atLimit && (
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <LockIcon className="h-3.5 w-3.5" />
              Maximum of {MAX_ACCOUNTS} accounts reached. Disconnect an account to add another.
            </p>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* Transactions                                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {selectedId && (
        <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400">
                <ReceiptIcon />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Transactions</h2>
                {selectedAccount && (
                  <p className="text-xs text-slate-400">
                    {selectedAccount.bankName} · {maskAccountNumber(selectedAccount.accountNumber)}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => selectedAccount && loadTransactions(selectedAccount.monoAccountId)}
              disabled={txLoading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <RefreshIcon className={txLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {txError && (
            <div className="mx-6 mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-50/60 px-5 py-4 dark:border-rose-900/50 dark:from-rose-950/30 dark:to-rose-950/20">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400">
                <ExclamationIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Failed to load transactions</p>
                <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">{txError}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {['Date', 'Description', 'Type', 'Amount', 'Balance'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${i >= 3 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {txLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4"><Shimmer className="h-3 w-20" /></td>
                        <td className="px-6 py-4"><Shimmer className="h-3 w-48" /></td>
                        <td className="px-6 py-4"><Shimmer className="h-5 w-14 rounded-full" /></td>
                        <td className="px-6 py-4 text-right"><Shimmer className="ml-auto h-3 w-20" /></td>
                        <td className="px-6 py-4 text-right"><Shimmer className="ml-auto h-3 w-20" /></td>
                      </tr>
                    ))
                  : transactions.length === 0 && !txError
                    ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-14 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
                              <ReceiptIcon className="h-6 w-6 text-blue-400" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">No transactions found</p>
                            <p className="text-xs text-slate-400">This account may have no transaction history in test mode</p>
                          </div>
                        </td>
                      </tr>
                    )
                    : transactions.map(tx => {
                        const isCredit = tx.type === 'credit';
                        return (
                          <tr
                            key={tx._id}
                            className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          >
                            <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(tx.date)}
                            </td>
                            <td className="max-w-xs px-6 py-4">
                              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                                {tx.narration || '—'}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
                                isCredit
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800'
                                  : 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-800'
                              }`}>
                                {isCredit ? '↑ Credit' : '↓ Debit'}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-right text-sm font-bold tabular-nums ${
                              isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {isCredit ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium tabular-nums text-slate-600 dark:text-slate-300">
                              {formatCurrency(tx.balance ?? 0)}
                            </td>
                          </tr>
                        );
                      })}
              </tbody>
            </table>
          </div>

          {!txLoading && transactions.length > 0 && (
            <div className="border-t border-slate-100 px-6 py-3 dark:border-slate-800">
              <p className="text-xs text-slate-400">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} · Mono sandbox data
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Reusable sub-components ──────────────────────────────────────────────── */
function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded bg-slate-100 dark:bg-slate-800 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" />
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */
function CogIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a7.8 7.8 0 00.1-1 7.8 7.8 0 00-.1-1l2-1.6-2-3.4-2.4 1a7.6 7.6 0 00-1.7-1l-.4-2.6h-4l-.4 2.6a7.6 7.6 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7.8 7.8 0 00-.1 1 7.8 7.8 0 00.1 1l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6z" />
    </svg>
  );
}

function BeakerIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6M9 3v8L4.5 17.5A2 2 0 006 21h12a2 2 0 001.5-3.5L15 11V3M9 3H7m8 0h2" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </svg>
  );
}

function BankIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l9 4v2H3V6l9-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8v10M9 8v10M15 8v10M19 8v10M3 18h18v2H3v-2z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18v14H3V7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l2-3h14l2 3M16 14h5" />
    </svg>
  );
}

function ReceiptIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function RefreshIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ExclamationIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}

function XIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function PlusCircleIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function LockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}
