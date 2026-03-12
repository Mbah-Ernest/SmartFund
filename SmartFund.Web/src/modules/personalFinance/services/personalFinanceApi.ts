import { api } from '../../../api/axios';
import { toApiClientError } from '../../../api/apiError';
import type {
  PersonalFinanceDashboardDto,
  MonthlyCategoryAmountRow,
  CashFlowRow,
  WalletBalanceRow,
  PersonalWalletDto,
  WalletBalanceDto,
  PersonalCategoryDto,
  CreatePersonalCategoryRequest,
  RenamePersonalCategoryRequest,
  BudgetDto,
  BudgetTrackingDto,
  RecordIncomeRequest,
  RecordExpenseRequest,
  RecordTransferRequest,
  RecordTransactionResponse,
  RecordInvestmentContributionRequest,
  CreatePersonalBudgetRequest,
  CreatePersonalWalletRequest,
  PersonalTransactionDto
} from '../types/financeTypes';

/* ── Dashboard & Reports ── */

export async function getDashboard(): Promise<PersonalFinanceDashboardDto> {
  try {
    const { data } = await api.get<PersonalFinanceDashboardDto>(
      '/personal-reports/dashboard'
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

/* ── Categories ── */

export async function getCategories(): Promise<PersonalCategoryDto[]> {
  try {
    const { data } = await api.get<PersonalCategoryDto[]>('/personal-categories');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function createCategory(
  request: CreatePersonalCategoryRequest
): Promise<PersonalCategoryDto> {
  try {
    const { data } = await api.post<PersonalCategoryDto>('/personal-categories', request);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function renameCategory(
  id: number,
  request: RenamePersonalCategoryRequest
): Promise<PersonalCategoryDto> {
  try {
    const { data } = await api.put<PersonalCategoryDto>(`/personal-categories/${id}`, request);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getMonthlyIncome(): Promise<MonthlyCategoryAmountRow[]> {
  try {
    const { data } = await api.get<MonthlyCategoryAmountRow[]>(
      '/personal-reports/monthly-income'
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getMonthlyExpenses(): Promise<MonthlyCategoryAmountRow[]> {
  try {
    const { data } = await api.get<MonthlyCategoryAmountRow[]>(
      '/personal-reports/monthly-expenses'
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getCashFlow(): Promise<CashFlowRow[]> {
  try {
    const { data } = await api.get<CashFlowRow[]>(
      '/personal-reports/cashflow'
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getWalletBalances(): Promise<WalletBalanceRow[]> {
  try {
    const { data } = await api.get<WalletBalanceRow[]>(
      '/personal-reports/wallet-balances'
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

/* ── Wallets ── */

export async function getWallets(): Promise<PersonalWalletDto[]> {
  try {
    const { data } = await api.get<PersonalWalletDto[]>('/personal-wallets');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getWalletBalance(
  id: number
): Promise<WalletBalanceDto> {
  try {
    const { data } = await api.get<WalletBalanceDto>(
      `/personal-wallets/${id}/balance`
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function createWallet(
  request: CreatePersonalWalletRequest
): Promise<PersonalWalletDto> {
  try {
    const { data } = await api.post<PersonalWalletDto>(
      '/personal-wallets',
      request
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

/* ── Transactions ── */

export type TransactionOrderBy = 'inputTime' | 'date' | 'amount';
export type TransactionOrderDirection = 'asc' | 'desc';

export async function getTransactions(options?: {
  orderBy?: TransactionOrderBy;
  direction?: TransactionOrderDirection;
  take?: number;
}): Promise<PersonalTransactionDto[]> {
  try {
    const params = new URLSearchParams();
    if (options?.orderBy) params.set('orderBy', options.orderBy);
    if (options?.direction) params.set('direction', options.direction);
    if (options?.take) params.set('take', String(options.take));

    const qs = params.toString();

    const { data } = await api.get<PersonalTransactionDto[]>(
      qs ? `/personal-transactions?${qs}` : '/personal-transactions'
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function recordIncome(
  request: RecordIncomeRequest
): Promise<RecordTransactionResponse> {
  try {
    const { data } = await api.post<RecordTransactionResponse>(
      '/personal-transactions/income',
      request
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function recordExpense(
  request: RecordExpenseRequest
): Promise<RecordTransactionResponse> {
  try {
    const { data } = await api.post<RecordTransactionResponse>(
      '/personal-transactions/expense',
      request
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function recordTransfer(
  request: RecordTransferRequest
): Promise<RecordTransactionResponse> {
  try {
    const { data } = await api.post<RecordTransactionResponse>(
      '/personal-transactions/transfer',
      request
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function recordInvestmentContribution(
  request: RecordInvestmentContributionRequest
): Promise<RecordTransactionResponse> {
  try {
    const { data } = await api.post<RecordTransactionResponse>(
      '/personal-transactions/investment-contribution',
      request
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

/* ── Budgets ── */

export async function getBudgets(): Promise<BudgetDto[]> {
  try {
    const { data } = await api.get<BudgetDto[]>('/personal-budgets');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function createBudget(
  request: CreatePersonalBudgetRequest
): Promise<BudgetDto> {
  try {
    const { data } = await api.post<BudgetDto>('/personal-budgets', request);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getBudgetTracking(
  budgetId: number
): Promise<BudgetTrackingDto[]> {
  try {
    const { data } = await api.get<BudgetTrackingDto[]>(
      `/personal-budgets/${budgetId}/tracking`
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}
