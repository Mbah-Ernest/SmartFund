import { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal';
import {
  getInvestmentAuditLog,
  getPersonalAuditLog,
  reverseAuditEntry
} from '../api/auditApi';
import { toApiClientError } from '../api/apiError';
import type { AuditEntryDto } from '../types/api';

type Tab = 'investment' | 'personal';

function relativeTime(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function ActionIcon({ action, isReversal }: { action: string; isReversal: boolean }) {
  if (isReversal) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
        </svg>
      </div>
    );
  }

  const lower = action.toLowerCase();
  if (lower.includes('fund')) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  }
  if (lower.includes('create') || lower.includes('contribution')) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );
}

function StatusBadge({ entry }: { entry: AuditEntryDto }) {
  if (entry.reversesAuditEntryId) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/50">
        ↩ Reversal
      </span>
    );
  }
  if (entry.reversedByAuditEntryId) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 line-through dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
        Reversed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/50">
      ✓ Active
    </span>
  );
}

export default function ActivityLogPage() {
  const [tab, setTab] = useState<Tab>('investment');
  const [investmentEntries, setInvestmentEntries] = useState<AuditEntryDto[]>([]);
  const [personalEntries, setPersonalEntries] = useState<AuditEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reversal modal state
  const [reverseTarget, setReverseTarget] = useState<AuditEntryDto | null>(null);
  const [reversePin, setReversePin] = useState('');
  const [reversing, setReversing] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const [reverseSuccess, setReverseSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [inv, pers] = await Promise.all([
        getInvestmentAuditLog(),
        getPersonalAuditLog()
      ]);
      setInvestmentEntries(inv);
      setPersonalEntries(pers);
    } catch (e) {
      setError(toApiClientError(e).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const entries = tab === 'investment' ? investmentEntries : personalEntries;

  const stats = useMemo(() => {
    const total = entries.length;
    const active = entries.filter(e => !e.reversedByAuditEntryId && !e.reversesAuditEntryId).length;
    const reversed = entries.filter(e => e.reversedByAuditEntryId != null).length;
    return { total, active, reversed };
  }, [entries]);

  function openReverse(entry: AuditEntryDto) {
    setReverseTarget(entry);
    setReversePin('');
    setReverseError(null);
    setReverseSuccess(null);
  }

  async function submitReverse() {
    if (!reverseTarget) return;
    setReverseError(null);
    setReversing(true);
    try {
      await reverseAuditEntry(reverseTarget.id, { pin: reversePin });
      setReverseSuccess(`Action #${reverseTarget.id} has been reversed.`);
      setReverseTarget(null);
      await load();
    } catch (e) {
      setReverseError(toApiClientError(e).message);
    } finally {
      setReversing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
          Activity Log
        </h1>
        <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
          Full audit trail of every action performed across the platform. Nothing is deleted — reverse any action with the authorized PIN.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60">
        <button
          type="button"
          onClick={() => setTab('investment')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
            tab === 'investment'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span className="mr-1.5">📊</span>
          Investment Management
          <span className="ml-2 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600 dark:bg-slate-600 dark:text-slate-200">
            {investmentEntries.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('personal')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
            tab === 'personal'
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span className="mr-1.5">💳</span>
          Personal Finance
          <span className="ml-2 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600 dark:bg-slate-600 dark:text-slate-200">
            {personalEntries.length}
          </span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-slate-900 dark:text-slate-50">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">{stats.active}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-3 dark:border-rose-900/50 dark:bg-rose-950/20">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Reversed</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-rose-700 dark:text-rose-300">{stats.reversed}</div>
        </div>
      </div>

      {/* Success toast */}
      {reverseSuccess ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <span>✅</span>
          <span>{reverseSuccess}</span>
          <button
            type="button"
            onClick={() => setReverseSuccess(null)}
            className="ml-auto text-xs text-emerald-500 hover:text-emerald-700"
          >
            dismiss
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {/* Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">Loading activity…</div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-3xl">📭</div>
            <div className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              No activity recorded yet for {tab === 'investment' ? 'Investment Management' : 'Personal Finance'}.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {entries.map(entry => {
              const isReversal = !!entry.reversesAuditEntryId;
              const isReversed = !!entry.reversedByAuditEntryId;
              const canReverse = !isReversal && !isReversed;

              return (
                <div
                  key={entry.id}
                  className={`group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30 ${
                    isReversed ? 'opacity-50' : ''
                  }`}
                >
                  <ActionIcon action={entry.action} isReversal={isReversal} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {entry.action}
                      </span>
                      <StatusBadge entry={entry} />
                      {entry.ledgerTransactionId ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          TX #{entry.ledgerTransactionId}
                        </span>
                      ) : null}
                    </div>

                    <p className={`mt-0.5 text-xs leading-relaxed ${
                      isReversed
                        ? 'text-slate-400 line-through dark:text-slate-500'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {entry.description}
                    </p>

                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                      <span title={formatDate(entry.createdAtUtc)}>
                        {relativeTime(entry.createdAtUtc)}
                      </span>
                      <span className="tabular-nums">#{entry.id}</span>
                      {isReversal ? (
                        <span className="text-rose-400">
                          reverses #{entry.reversesAuditEntryId}
                        </span>
                      ) : null}
                      {isReversed ? (
                        <span className="text-slate-400">
                          reversed by #{entry.reversedByAuditEntryId}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 pt-1">
                    {canReverse ? (
                      <button
                        type="button"
                        onClick={() => openReverse(entry)}
                        className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 opacity-0 shadow-sm transition-all duration-200 hover:bg-rose-50 hover:shadow group-hover:opacity-100 dark:border-rose-900/50 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700"
                      >
                        ↩ Reverse
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reversal Modal */}
      <Modal
        open={reverseTarget !== null}
        title="Reverse Action"
        onClose={() => (reversing ? null : setReverseTarget(null))}
        footer={
          <>
            <button
              type="button"
              onClick={() => setReverseTarget(null)}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              disabled={reversing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitReverse()}
              className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              disabled={reversing || reversePin.trim().length === 0}
            >
              {reversing ? 'Reversing…' : 'Confirm Reversal'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {reverseError ? (
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
              {reverseError}
            </div>
          ) : null}

          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200">⚠️ This action cannot be undone</p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              Reversing will create a new counter-entry that neutralizes the original action. The original record is preserved for audit purposes. If a ledger transaction is attached, a reversal transaction will be posted.
            </p>
          </div>

          {reverseTarget ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {reverseTarget.action}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {reverseTarget.description}
              </div>
              <div className="mt-1 text-[11px] tabular-nums text-slate-400">
                #{reverseTarget.id} · {formatDate(reverseTarget.createdAtUtc)}
                {reverseTarget.ledgerTransactionId ? ` · TX #${reverseTarget.ledgerTransactionId}` : ''}
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Reversal PIN
            </label>
            <input
              type="password"
              value={reversePin}
              onChange={e => setReversePin(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:focus:ring-rose-900/50"
              placeholder="Enter reversal PIN"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && reversePin.trim().length > 0 && !reversing) {
                  void submitReverse();
                }
              }}
            />
            <p className="text-[11px] text-slate-400">
              Contact your administrator if you do not have the reversal PIN.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
