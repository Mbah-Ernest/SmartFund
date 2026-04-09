import type { PersonalTransactionDto } from '../types/financeTypes';

export type TransactionWithBalance = PersonalTransactionDto & {
  runningBalance: number;
};

/**
 * Sorts transactions by date ASC then id ASC, then accumulates a running balance
 * starting from openingBalance.
 *
 * Income  → +amount
 * Expense → -amount
 * Adjustment → +amount (signed diff stored in amount field, may be negative)
 * Transfer → neutral (does not change balance of the single wallet view; the
 *             wallet only sees the debit or credit side, not both, so we treat
 *             transfer rows as -amount from the source wallet's perspective)
 */
export function computeRunningBalance(
  transactions: PersonalTransactionDto[],
  openingBalance: number
): TransactionWithBalance[] {
  const sorted = [...transactions].sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return dateDiff !== 0 ? dateDiff : a.id - b.id;
  });

  let running = openingBalance;
  return sorted.map((tx) => {
    const t = tx.type.toLowerCase();
    if (t === 'income') {
      running += tx.amount;
    } else if (t === 'expense' || t === 'investment') {
      running -= tx.amount;
    } else if (t === 'adjustment') {
      // amount field holds signed diff (positive or negative)
      running += tx.amount;
    }
    // Transfer: neutral — the wallet ledger view will show transfer rows but
    // their effect is already captured by the ledger entries on the other side;
    // for a single-wallet view we skip the balance change here.
    return { ...tx, runningBalance: running };
  });
}
