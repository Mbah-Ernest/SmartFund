export type PersonalFinanceDashboardDto = {
  totalBalance: number;
  walletBalance: number;
  connectedBankBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  topExpenseCategories: CategoryAmountRow[];
  investmentContributions: number;
};

export type CategoryAmountRow = {
  categoryId: number;
  categoryName: string;
  amount: number;
};

export type MonthlyCategoryAmountRow = {
  walletId: number;
  walletName: string;
  year: number;
  month: number;
  categoryId: number;
  categoryName: string;
  amount: number;
};

export type CashFlowRow = {
  walletId: number;
  walletName: string;
  year: number;
  month: number;
  categoryId: number;
  categoryName: string;
  inflow: number;
  outflow: number;
  net: number;
};

export type WalletBalanceRow = {
  walletId: number;
  walletName: string;
  year: number;
  month: number;
  balance: number;
};

export type PersonalWalletDto = {
  id: number;
  name: string;
  currency: string;
  ledgerAccountId: number;
  createdAt: string;
  openingBalance: number;
  openingBalanceDate: string | null;
};

export type SetOpeningBalanceRequest = {
  amount: number;
  date: string;
};

export type ReconcileResponse = {
  diff: number;
  newBalance: number;
};

export type WalletBalanceDto = {
  walletId: number;
  balance: number;
};

export type BudgetDto = {
  id: number;
  categoryId: number;
  amount: number;
  period: number;
};

export type BudgetTrackingDto = {
  budgetId: number;
  year: number;
  month: number;
  spentAmount: number;
  remainingAmount: number;
  isOverBudget: boolean;
};

export type RecordIncomeRequest = {
  walletId: number;
  categoryId: number;
  amount: number;
  description?: string;
  date: string;
};

export type RecordExpenseRequest = {
  walletId: number;
  categoryId: number;
  amount: number;
  description?: string;
  date: string;
};

export type RecordTransferRequest = {
  sourceWalletId: number;
  destinationWalletId: number;
  amount: number;
  description?: string;
  date: string;
};

export type RecordTransactionResponse = {
  ledgerTransactionId: number;
};

export type CreatePersonalBudgetRequest = {
  categoryId: number;
  amount: number;
  period: number;
};

export type CreatePersonalWalletRequest = {
  name: string;
  currency: string;
};

export type RecordInvestmentContributionRequest = {
  walletId: number;
  trancheId: number;
  amount: number;
  description?: string;
};

export type PersonalCategoryDto = {
  id: number;
  name: string;
  type: number;
};

export type PersonalTransactionDto = {
  id: number;
  amount: number;
  wallet: string;
  walletId: number;
  category: string;
  type: string;
  date: string;
  description: string | null;
  source: string;
  sourceConnectedBankAccountId: number | null;
  sourceBankImportedTransactionId: number | null;
  sourceBankLabel: string | null;
};

export type CreatePersonalCategoryRequest = {
  name: string;
  type: number;
};

export type RenamePersonalCategoryRequest = {
  name: string;
};

export const PERSONAL_CATEGORY_TYPE = {
  Expense: 1,
  Income: 2
} as const;

/* Derived view-model types for charts */

export type MonthlyIncomeExpense = {
  month: string;
  income: number;
  expenses: number;
};

export type NetWorthPoint = {
  month: string;
  balance: number;
};

export type InvestmentContributionPoint = {
  month: string;
  amount: number;
};

export type FinancialInsight = {
  id: string;
  icon: 'trending-down' | 'trending-up' | 'alert' | 'info' | 'star';
  message: string;
  sentiment: 'positive' | 'negative' | 'neutral';
};

export type PersonalFinanceSettingsDto = {
  launchDateUtc: string;
  createdAtUtc: string | null;
  updatedAtUtc: string | null;
  lastResetAtUtc: string | null;
  isConfigured: boolean;
};

export type ResetResultDto = {
  deletedPersonalTransactions: number;
  deletedLedgerTransactions: number;
  message: string;
};

/* ── Personal Debts ── */

export type DebtStatus = 'Active' | 'PaidOff' | 'Forgiven';

export type DebtPaymentDto = {
  id: number;
  amount: number;
  paidOn: string;
  note: string | null;
  recordedAt: string;
};

export type PersonalDebtDto = {
  id: number;
  userId: number;
  creditorName: string;
  principalAmount: number;
  totalAmountDue: number;
  totalPaid: number;
  remainingBalance: number;
  interestAmount: number;
  progressPercent: number;
  dueDate: string;
  daysUntilDue: number;
  description: string | null;
  status: DebtStatus;
  createdAt: string;
  updatedAt: string | null;
  payments: DebtPaymentDto[];
};

export type CreatePersonalDebtRequest = {
  creditorName: string;
  principalAmount: number;
  totalAmountDue: number;
  dueDate: string;
  description?: string;
};

export type UpdatePersonalDebtRequest = {
  creditorName: string;
  totalAmountDue: number;
  dueDate: string;
  description?: string;
};

export type RecordDebtPaymentRequest = {
  amount: number;
  paidOn: string;
  note?: string;
};

export type RecordDebtPaymentResponse = {
  payment: DebtPaymentDto;
  updatedDebt: PersonalDebtDto;
};

export type DebtSavingsTarget = {
  debtId: number;
  creditorName: string;
  dailySavingsTarget: number;
  weeklySavingsTarget: number;
};

export type DebtCoverageItem = {
  debtId: number;
  creditorName: string;
  remainingBalance: number;
  daysUntilDue: number;
  projectedSavingsByDue: number;
  canCover: boolean;
};

export type RankedDebt = {
  debtId: number;
  creditorName: string;
  remainingBalance: number;
  daysUntilDue: number;
  urgencyBadge: 'Overdue' | 'Critical' | 'Soon' | 'Upcoming' | 'Future';
};

export type DebtInsightsDto = {
  totalOwed: number;
  totalInterest: number;
  totalPaid: number;
  percentPaid: number;
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  avgMonthlySavings: number;
  savingsInsufficient: boolean;
  monthlyDebtBurden: number;
  burdenPercent: number;
  debtFreeDate: string | null;
  savingsTargets: DebtSavingsTarget[];
  coverageItems: DebtCoverageItem[];
  urgencyRanking: RankedDebt[];
};
