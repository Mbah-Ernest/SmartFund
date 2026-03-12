import { useEffect, useMemo, useState } from 'react';
import { getLedgerTransaction, getLedgerTransactions } from '../api/ledgerApi';
import { toApiClientError } from '../api/apiError';
import InfoTooltip from '../modules/personalFinance/components/InfoTooltip';
import type {
  LedgerTransactionDto,
  LedgerTransactionListItemDto
} from '../types/api';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(amount);
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function statusLabel(status: number) {
  if (status === 1) return 'Draft';
  if (status === 2) return 'Posted';
  if (status === 3) return 'Reversed';
  return `Unknown (${status})`;
}

function StatusPill({ status }: { status: number }) {
  const label = statusLabel(status);
  const normalized = label.toLowerCase();

  const cls =
    normalized === 'posted'
      ? 'bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400'
      : normalized === 'draft'
        ? 'bg-slate-500/10 text-slate-500 ring-1 ring-inset ring-slate-500/20 dark:text-slate-400'
        : 'bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400';

  const dot =
    normalized === 'posted'
      ? 'bg-emerald-500'
      : normalized === 'draft'
        ? 'bg-slate-400'
        : 'bg-amber-500';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}
      title={label}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

export default function LedgerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransactionListItemDto[]>(
    []
  );

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [detailsById, setDetailsById] = useState<
    Record<number, LedgerTransactionDto | undefined>
  >({});
  const [detailsErrorById, setDetailsErrorById] = useState<
    Record<number, string | undefined>
  >({});
  const [detailsLoadingById, setDetailsLoadingById] = useState<
    Record<number, boolean | undefined>
  >({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getLedgerTransactions();
      setTransactions(data);
    } catch (e) {
      setError(toApiClientError(e).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const postedCount = useMemo(
    () => transactions.filter(t => t.status === 2).length,
    [transactions]
  );

  const draftCount = useMemo(
    () => transactions.filter(t => t.status === 1).length,
    [transactions]
  );

  async function toggleRow(id: number) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    if (detailsById[id] || detailsLoadingById[id]) return;

    setDetailsErrorById(prev => ({ ...prev, [id]: undefined }));
    setDetailsLoadingById(prev => ({ ...prev, [id]: true }));

    try {
      const detail = await getLedgerTransaction(id);
      setDetailsById(prev => ({ ...prev, [id]: detail }));
    } catch (e) {
      setDetailsErrorById(prev => ({
        ...prev,
        [id]: toApiClientError(e).message
      }));
    } finally {
      setDetailsLoadingById(prev => ({ ...prev, [id]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Ledger</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every financial movement in the fund, recorded as balanced debits &amp; credits.
        </p>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total</span>
          <span className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{transactions.length.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Posted</span>
          <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{postedCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Draft</span>
          <span className="text-sm font-bold tabular-nums text-slate-600 dark:text-slate-300">{draftCount.toLocaleString()}</span>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-50/60 px-5 py-4 shadow-sm dark:border-rose-900/50 dark:from-rose-950/30 dark:to-rose-950/20">
          <span className="text-rose-500">?</span>
          <div>
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Failed to load</p>
            <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        </div>
      ) : null}

      {/* Transaction list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-500 dark:border-slate-700 dark:border-t-blue-400" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-sm text-slate-400">No transactions found.</p>
          </div>
        ) : (
          transactions.map(tx => {
            const isExpanded = !!expanded[tx.id];
            const details = detailsById[tx.id];
            const detailsLoading = !!detailsLoadingById[tx.id];
            const detailsError = detailsErrorById[tx.id];
            const postedTime = formatDateTime(tx.postedAtUtc);

            return (
              <div
                key={tx.id}
                className="overflow-visible rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-200/60 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(59,130,246,0.06)] dark:bg-slate-900 dark:ring-slate-800"
              >
                {/* Main row */}
                <button
                  type="button"
                  onClick={() => void toggleRow(tx.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  {/* Expand icon */}
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs transition-transform duration-200 ${isExpanded ? 'rotate-90 bg-blue-50 text-blue-500 dark:bg-blue-950/50 dark:text-blue-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                    ?
                  </span>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {tx.narration}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-mono">#{tx.id}</span>
                      {tx.sequenceNumber ? (
                        <>
                          <span>·</span>
                          <span>Seq {tx.sequenceNumber}</span>
                        </>
                      ) : null}
                      {postedTime ? (
                        <>
                          <span>·</span>
                          <span>{postedTime}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Status */}
                  <StatusPill status={tx.status} />
                </button>

                {/* Expanded entries */}
                {isExpanded ? (
                  <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/20">
                    {detailsLoading ? (
                      <div className="flex items-center gap-2 py-2 text-sm text-slate-400">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
                        Loading entries…
                      </div>
                    ) : detailsError ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                        {detailsError}
                      </div>
                    ) : details ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                            Journal Entries
                          </span>
                          <InfoTooltip text="Every ledger transaction has balanced entries — debits must equal credits. This is double-entry bookkeeping." />
                        </div>

                        <div className="overflow-hidden rounded-xl ring-1 ring-slate-200 dark:ring-slate-800">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-slate-100/80 dark:bg-slate-800/60">
                                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-400">Account</th>
                                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">Debit</th>
                                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-widest text-slate-400">Credit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {details.entries.map((e, idx) => (
                                <tr key={idx} className="transition-colors hover:bg-white dark:hover:bg-slate-900/40">
                                  <td className="px-4 py-2.5">
                                    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200/70 text-[10px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                        {e.accountId}
                                      </span>
                                      Account {e.accountId}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    {e.debit > 0 ? (
                                      <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                                        {formatCurrency(e.debit)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-600">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    {e.credit > 0 ? (
                                      <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(e.credit)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-600">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-50/80 dark:bg-slate-800/40">
                                <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Total</td>
                                <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">
                                  {formatCurrency(details.entries.reduce((sum, e) => sum + (e.debit ?? 0), 0))}
                                </td>
                                <td className="px-4 py-2.5 text-right text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(details.entries.reduce((sum, e) => sum + (e.credit ?? 0), 0))}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400">—</div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
