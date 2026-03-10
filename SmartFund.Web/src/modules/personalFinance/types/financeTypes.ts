export type PersonalFinanceDashboardDto = {
  totalBalance: number;
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
