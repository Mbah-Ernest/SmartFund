import { Fragment, useEffect, useMemo, useState } from 'react';
import { getLedgerTransaction, getLedgerTransactions } from '../api/ledgerApi';
import { toApiClientError } from '../api/apiError';
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
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function statusLabel(status: number) {
  if (status === 1) return 'Draft';
  if (status === 2) return 'Posted';
  if (status === 3) return 'Reversed';
  return `Unknown (${status})`;
}

function StatusPill({ status }: { status: number }) {
  const normalized = statusLabel(status).toLowerCase();

  const cls =
    normalized === 'posted'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50'
      : normalized === 'draft'
        ? 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700'
        : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/35 dark:text-amber-200 dark:ring-amber-900/50';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
      title={statusLabel(status)}
    >
      {statusLabel(status)}
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
        <h1 className="text-2xl font-semibold">Ledger</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Financial transactions ({transactions.length.toLocaleString()}) —{' '}
          {postedCount.toLocaleString()} posted.
        </p>
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
                <th className="w-10 px-4 py-3" aria-label="Expand" />
                <th className="px-4 py-3">Sequence</th>
                <th className="px-4 py-3">Narration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Posted time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={5}>
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map(tx => {
                  const isExpanded = !!expanded[tx.id];
                  const details = detailsById[tx.id];
                  const detailsLoading = !!detailsLoadingById[tx.id];
                  const detailsError = detailsErrorById[tx.id];

                  return (
                    <Fragment key={tx.id}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void toggleRow(tx.id)}
                            className="rounded p-1 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            <span aria-hidden>{isExpanded ? '▾' : '▸'}</span>
                          </button>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                          {tx.sequenceNumber || (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          <div className="space-y-0.5">
                            <div className="font-medium text-slate-900 dark:text-slate-50">
                              {tx.narration}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">#{tx.id}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={tx.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {formatDateTime(tx.postedAtUtc)}
                        </td>
                      </tr>

                      {isExpanded ? (
                        <tr className="bg-slate-50/40 dark:bg-slate-950/30">
                          <td colSpan={5} className="px-4 py-4">
                            {detailsLoading ? (
                              <div className="text-sm text-slate-500">
                                Loading entries…
                              </div>
                            ) : detailsError ? (
                              <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                {detailsError}
                              </div>
                            ) : details ? (
                              <div className="space-y-3">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                  Entries
                                </div>

                                <div className="overflow-auto rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                  <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                                      <tr>
                                        <th className="px-3 py-2">Account</th>
                                        <th className="px-3 py-2 text-right">Debit</th>
                                        <th className="px-3 py-2 text-right">Credit</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                      {details.entries.map((e, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                          <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-50">
                                            {e.accountId}
                                          </td>
                                          <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                                            {e.debit > 0
                                              ? formatCurrency(e.debit)
                                              : '—'}
                                          </td>
                                          <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                                            {e.credit > 0
                                              ? formatCurrency(e.credit)
                                              : '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-500">—</div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
