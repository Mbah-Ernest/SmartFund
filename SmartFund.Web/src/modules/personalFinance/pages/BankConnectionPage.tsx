import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getBankConnectToken,
  connectBankAccount,
  getConnectedAccounts,
  disconnectBankAccount,
  syncBankAccount,
  getReauthToken,
  getWallets,
  createWallet,
  setOpeningBalance,
  deleteWallet,
  type ConnectedBankAccountDto,
} from '../services/personalFinanceApi';
import type { PersonalWalletDto } from '../types/financeTypes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertCircle, CheckCircle2, X, Plus, RefreshCw, Trash2,
  Lock, Clock, Inbox, ListChecks, Building2, PlusCircle, Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNaira } from '@/lib/utils';

/* ── Mono Connect widget type ───────────────────────────────────────────── */
declare global {
  interface Window {
    Connect: new (config: {
      key: string;
      data?: { customer?: { name?: string; email?: string } };
      onSuccess: (data: { code?: string; id?: string }) => void;
      onClose?: () => void;
    }) => { setup: () => void; open: () => void };
  }
}

const MONO_SCRIPT_URL = 'https://connect.withmono.com/connect.js';
const MAX_ACCOUNTS = 5;

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

function formatCurrency(amount: number, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function extractErrorMessage(err: unknown): string {
  if (err != null && typeof err === 'object') {
    if ('message' in err) return String((err as { message: string }).message);
  }
  return 'An unexpected error occurred.';
}

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

/* ── PIN Confirm Dialog ─────────────────────────────────────────────────── */
interface PinDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: (pin: string) => Promise<void>;
  onCancel: () => void;
}

function PinConfirmDialog({ open, title, description, confirmLabel = 'Confirm', onConfirm, onCancel }: PinDialogProps) {
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(o: boolean) {
    if (!o) {
      setPin('');
      setError(null);
      onCancel();
    }
  }

  async function handleConfirm() {
    if (!pin.trim()) {
      setError('Enter your password.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(pin);
      setPin('');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Input
            type="password"
            placeholder="Enter your password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleConfirm(); }}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setPin(''); setError(null); onCancel(); }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => { e.preventDefault(); void handleConfirm(); }}
            disabled={submitting}
          >
            {submitting ? 'Confirming…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ── Add Manual Wallet Dialog ───────────────────────────────────────────── */
interface AddManualWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (wallet: PersonalWalletDto) => void;
}

function AddManualWalletDialog({ open, onOpenChange, onCreated }: AddManualWalletDialogProps) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [balanceDate, setBalanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setBalance('');
    setBalanceDate(new Date().toISOString().slice(0, 10));
    setError(null);
  }

  function handleOpenChange(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Enter a wallet name.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const wallet = await createWallet({ name: name.trim(), currency: 'NGN' });
      const amt = parseFloat(balance);
      if (!isNaN(amt) && amt > 0) {
        await setOpeningBalance(wallet.id, { amount: amt, date: balanceDate });
        // Return a wallet with the opening balance filled in
        onCreated({ ...wallet, openingBalance: amt, openingBalanceDate: balanceDate });
      } else {
        onCreated(wallet);
      }
      toast('Manual wallet created');
      handleOpenChange(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Manual Wallet</DialogTitle>
          <DialogDescription>
            Create a wallet you track manually — no bank sync needed. You can record transactions
            on the Transactions page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Wallet name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GTBank Savings, Cash, Piggybank"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Starting balance (₦) <span className="text-muted-foreground/60">— optional</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              onBlur={() => {
                if (balance !== '' && !isNaN(parseFloat(balance))) {
                  setBalance(parseFloat(balance).toFixed(2));
                }
              }}
              placeholder="0.00"
            />
            <p className="text-[11px] text-muted-foreground">
              Set the current balance of this account before you started tracking it here.
            </p>
          </div>

          {balance !== '' && !isNaN(parseFloat(balance)) && parseFloat(balance) > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Balance as of date</label>
              <Input
                type="date"
                value={balanceDate}
                onChange={(e) => setBalanceDate(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">Cancel</Button>
          </DialogClose>
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────── */

export default function BankConnectionPage() {
  const [accounts, setAccounts] = useState<ConnectedBankAccountDto[]>([]);
  const [manualWallets, setManualWallets] = useState<PersonalWalletDto[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [reauthingId, setReauthingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Disconnect Mono bank — PIN dialog
  const [disconnectTarget, setDisconnectTarget] = useState<ConnectedBankAccountDto | null>(null);

  // Delete manual wallet — PIN dialog
  const [deleteWalletTarget, setDeleteWalletTarget] = useState<PersonalWalletDto | null>(null);

  // Add manual wallet dialog
  const [addWalletOpen, setAddWalletOpen] = useState(false);

  const scriptLoadedRef = useRef(false);

  const loadData = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const [accs, wallets] = await Promise.all([getConnectedAccounts(), getWallets()]);
      setAccounts(accs);
      const linkedIds = new Set(accs.map(a => a.personalWalletId).filter(Boolean));
      setManualWallets(wallets.filter(w => !linkedIds.has(w.id)));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

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
        onSuccess: async (data: { code?: string; id?: string }) => {
          try {
            const authCode = data.code ?? data.id;
            if (!authCode) throw new Error('Mono did not return an authorization code.');
            const account = await connectBankAccount(authCode);
            setAccounts(prev => {
              const exists = prev.some(a => a.id === account.id);
              return exists ? prev.map(a => a.id === account.id ? account : a) : [...prev, account];
            });
            toast.success(`${account.bankName} connected! Initial sync starting in the background.`);
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

  async function handleSync(account: ConnectedBankAccountDto) {
    setSyncingId(account.id);
    setError(null);
    try {
      const updated = await syncBankAccount(account.id);
      setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast.success(`${account.bankName} synced — ${updated.totalTransactionsSynced} total transactions.`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDisconnect(pin: string) {
    if (!disconnectTarget) return;
    await disconnectBankAccount(disconnectTarget.id, pin);
    setAccounts(prev => prev.filter(a => a.id !== disconnectTarget.id));
    toast.success(`${disconnectTarget.bankName} disconnected.`);
    setDisconnectTarget(null);
  }

  async function handleDeleteWallet(pin: string) {
    if (!deleteWalletTarget) return;
    await deleteWallet(deleteWalletTarget.id, pin);
    setManualWallets(prev => prev.filter(w => w.id !== deleteWalletTarget.id));
    toast.success(`"${deleteWalletTarget.name}" deleted.`);
    setDeleteWalletTarget(null);
  }

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
          await loadData();
          toast.success(`${account.bankName} reconnected successfully.`);
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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Connections</h1>
          <p className="text-muted-foreground text-sm">
            Connect banks via Mono for auto-sync, or add manual wallets to track cash/savings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" asChild>
            <Link to="/finance/bank/inbox" className="gap-2">
              <Inbox className="h-4 w-4" />
              Review Inbox
            </Link>
          </Button>
          <Button
            onClick={openConnectWidget}
            disabled={connecting || atLimit}
            variant={atLimit ? 'secondary' : 'default'}
            className="gap-2"
          >
            {connecting ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Connecting…</>
            ) : atLimit ? (
              'Limit Reached'
            ) : accounts.length === 0 ? (
              <><Building2 className="h-4 w-4" /> Connect Bank Account</>
            ) : (
              <><Plus className="h-4 w-4" /> Connect Another Bank</>
            )}
          </Button>
        </div>
      </div>

      {/* Reauth warning */}
      {reauthCount > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/20">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Reconnection Required</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            {reauthCount === 1 ? '1 account needs' : `${reauthCount} accounts need`} to be reconnected.
            Click <strong>Reconnect</strong> on the affected account below.
          </AlertDescription>
        </Alert>
      )}

      {/* Error banner */}
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

      {/* ── Connected Bank Accounts (Mono) ─────────────────────────────── */}
      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm">Connected Bank Accounts</CardTitle>
                <CardDescription>
                  {accounts.length === 0 ? 'No accounts connected yet.' : `${accounts.length} / ${MAX_ACCOUNTS} connected · Auto-sync every 15 min`}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {accountsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-muted py-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">No bank accounts connected</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Connect your first account via Mono and transactions will sync automatically.
                </p>
              </div>
              <Button onClick={openConnectWidget} disabled={connecting} className="gap-2">
                <Building2 className="h-4 w-4" />
                Connect Your First Bank
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map(account => {
                const gradient = bankGradient(account.bankName);
                const isSyncing = syncingId === account.id;
                const isReathing = reauthingId === account.id;
                const needsReauth = account.syncStatus === 'ReauthRequired';
                const hasError = account.syncStatus === 'Error';

                return (
                  <div
                    key={account.id}
                    className={`relative overflow-hidden rounded-2xl ring-1 transition-all duration-200 shadow-sm hover:shadow-md ${
                      needsReauth ? 'ring-amber-300 dark:ring-amber-700'
                      : hasError ? 'ring-rose-300 dark:ring-rose-700'
                      : 'ring-border hover:-translate-y-0.5'
                    }`}
                  >
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
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          needsReauth ? 'bg-amber-400/90 text-amber-900'
                          : hasError ? 'bg-rose-400/90 text-rose-900'
                          : 'bg-white/20 text-white/90'
                        }`}>
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

                    <div className="flex items-center justify-between gap-2 bg-card px-4 py-3">
                      {needsReauth ? (
                        <>
                          <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            Reconnection required
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleReauth(account)}
                            disabled={isReathing}
                            className="h-7 text-xs border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
                          >
                            {isReathing && <RefreshCw className="h-3 w-3 animate-spin mr-1" />}
                            Reconnect
                          </Button>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-[11px] text-muted-foreground">
                              Synced {formatRelativeTime(account.lastSyncedAtUtc)}
                            </p>
                            {hasError && account.lastSyncError && (
                              <button
                                type="button"
                                onClick={() => setError(account.lastSyncError)}
                                className="mt-0.5 max-w-[200px] text-left text-[10px] text-destructive underline decoration-destructive/50 underline-offset-2 break-words"
                                title="Click to view full error"
                              >
                                {account.lastSyncError}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSync(account)}
                              disabled={isSyncing}
                              title="Sync now"
                              className="h-8 w-8"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setDisconnectTarget(account)}
                              title="Disconnect"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {!atLimit && accounts.length > 0 && (
                <button
                  type="button"
                  onClick={openConnectWidget}
                  disabled={connecting}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted py-10 text-muted-foreground transition-all hover:border-primary/30 hover:text-primary hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {connecting ? <RefreshCw className="h-6 w-6 animate-spin" /> : <PlusCircle className="h-7 w-7" />}
                  <span className="text-xs font-semibold">Connect Another Bank</span>
                  <span className="text-[11px]">
                    {MAX_ACCOUNTS - accounts.length} slot{MAX_ACCOUNTS - accounts.length !== 1 ? 's' : ''} remaining
                  </span>
                </button>
              )}
            </div>
          )}

          {atLimit && (
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Maximum of {MAX_ACCOUNTS} accounts reached. Disconnect one to add another.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Manual Wallets ─────────────────────────────────────────────── */}
      <Card className="rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm">Manual Wallets</CardTitle>
                <CardDescription>
                  Cash, savings, or any account you track by hand — no bank sync.
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={() => setAddWalletOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Wallet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accountsLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : manualWallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted py-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
                <Wallet className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">No manual wallets yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a wallet for cash, a savings account, or any account you don't sync via Mono.
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddWalletOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Your First Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {manualWallets.map(wallet => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{wallet.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {wallet.openingBalanceDate
                          ? `Starting balance: ${formatNaira(wallet.openingBalance)}`
                          : 'No starting balance set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-[10px]">Manual</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteWalletTarget(wallet)}
                      title="Delete wallet"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick-navigation cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/finance/bank/inbox"
          className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-950/40 dark:text-orange-400">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Review Inbox</p>
            <p className="text-xs text-muted-foreground">Categorize pending transactions</p>
          </div>
        </Link>

        <Link
          to="/finance/bank/rules"
          className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500 dark:bg-violet-950/40 dark:text-violet-400">
            <ListChecks className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Categorization Rules</p>
            <p className="text-xs text-muted-foreground">Auto-post matching transactions</p>
          </div>
        </Link>

        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold">Auto-Sync</p>
            <p className="text-xs text-muted-foreground">Background sync every 15 min</p>
          </div>
        </div>
      </div>

      {/* Disconnect Mono bank — PIN dialog */}
      <PinConfirmDialog
        open={disconnectTarget !== null}
        title={`Disconnect ${disconnectTarget?.bankName}?`}
        description="Your transaction history will be kept. Enter your password to confirm."
        confirmLabel="Disconnect"
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectTarget(null)}
      />

      {/* Delete manual wallet — PIN dialog */}
      <PinConfirmDialog
        open={deleteWalletTarget !== null}
        title={`Delete "${deleteWalletTarget?.name}"?`}
        description="All transactions in this wallet will also be deleted. This cannot be undone. Enter your password to confirm."
        confirmLabel="Delete"
        onConfirm={handleDeleteWallet}
        onCancel={() => setDeleteWalletTarget(null)}
      />

      {/* Add manual wallet dialog */}
      <AddManualWalletDialog
        open={addWalletOpen}
        onOpenChange={setAddWalletOpen}
        onCreated={(wallet) => setManualWallets(prev => [...prev, wallet])}
      />
    </div>
  );
}
