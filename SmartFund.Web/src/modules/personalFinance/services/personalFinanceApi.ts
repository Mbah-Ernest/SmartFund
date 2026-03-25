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
  PersonalTransactionDto,
  PersonalFinanceSettingsDto,
  ResetResultDto
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

export interface CashRunwayDto {
  totalBalanceNaira: number;
  avgMonthlyBurnNaira: number;
  runwayMonths: number | null;
  lastMonthBurnNaira: number;
  /** Fractional change of last month vs 3-month avg. Positive = rising burn. */
  burnTrend: number;
}

export async function getCashRunway(): Promise<CashRunwayDto> {
  try {
    const { data } = await api.get<CashRunwayDto>('/personal-reports/runway');
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

/* ── Bank Accounts ── */

export interface ConnectedBankAccountDto {
  id: number;
  monoAccountId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  balanceNaira: number;
  syncStatus: 'Active' | 'ReauthRequired' | 'Error';
  lastSyncedAtUtc: string;
  lastSyncError: string | null;
  totalTransactionsSynced: number;
  connectedAtUtc: string;
  personalWalletId: number | null;
}

export interface BankInboxItemDto {
  id: number;
  connectedBankAccountId: number;
  monoTransactionId: string;
  amountNaira: number;
  direction: 'credit' | 'debit';
  rawNarration: string;
  normalizedNarration: string | null;
  extractedMerchant: string | null;
  transactionDateUtc: string;
  importedAtUtc: string;
  status: string;
  isPending: boolean;
  isReversal: boolean;
  transferPairImportId: number | null;
}

export interface BankInboxPageDto {
  page: number;
  pageSize: number;
  totalCount: number;
  items: BankInboxItemDto[];
}

export interface BankRuleDto {
  id: number;
  matchText: string;
  isRegex: boolean;
  caseSensitive: boolean;
  categoryId: number;
  transactionType: string;
  priority: number;
  isActive: boolean;
  description: string | null;
  autoPostCredits: boolean;
  createdAtUtc: string;
  lastMatchedAtUtc: string | null;
  matchCount: number;
}

export async function getBankConnectToken(): Promise<string> {
  try {
    const { data } = await api.get<{ token: string }>('/bank/connect-token');
    return data.token;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function connectBankAccount(authCode: string): Promise<ConnectedBankAccountDto> {
  try {
    const { data } = await api.post<ConnectedBankAccountDto>('/bank/connect', { authCode });
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getConnectedAccounts(): Promise<ConnectedBankAccountDto[]> {
  try {
    const { data } = await api.get<ConnectedBankAccountDto[]>('/bank/accounts');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function disconnectBankAccount(id: number): Promise<void> {
  try {
    await api.delete(`/bank/accounts/${id}`);
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function syncBankAccount(id: number): Promise<ConnectedBankAccountDto> {
  try {
    const { data } = await api.post<ConnectedBankAccountDto>(`/bank/accounts/${id}/sync`);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getReauthToken(id: number): Promise<string> {
  try {
    const { data } = await api.put<{ token: string }>(`/bank/accounts/${id}/reauth`);
    return data.token;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getBankInbox(
  page = 1, pageSize = 50, accountId?: number
): Promise<BankInboxPageDto> {
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (accountId) params.set('accountId', String(accountId));
    const { data } = await api.get<BankInboxPageDto>(`/bank/inbox?${params}`);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getBankInboxCount(): Promise<number> {
  try {
    const { data } = await api.get<{ count: number }>('/bank/inbox/count');
    return data.count;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function categorizeInboxItem(
  importId: number,
  body: {
    walletId: number;
    categoryId: number;
    transactionType: string;
    description?: string | null;
    createRule: boolean;
    ruleMatchText?: string | null;
  }
): Promise<{ ledgerTransactionId: number }> {
  try {
    const { data } = await api.post<{ ledgerTransactionId: number }>(
      `/bank/inbox/${importId}/categorize`,
      body
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function excludeInboxItem(importId: number, note?: string): Promise<void> {
  try {
    await api.post(`/bank/inbox/${importId}/exclude`, { note: note ?? null });
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function pairTransfer(importIdA: number, importIdB: number): Promise<void> {
  try {
    await api.post('/bank/inbox/pair', { importIdA, importIdB });
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function unpairTransfer(importId: number): Promise<void> {
  try {
    await api.post(`/bank/inbox/${importId}/unpair`);
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function bulkCategorize(body: {
  importIds: number[];
  walletId: number;
  categoryId: number;
  transactionType: string;
}): Promise<{ posted: number }> {
  try {
    const { data } = await api.post<{ posted: number }>('/bank/inbox/bulk-categorize', body);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getBankRules(): Promise<BankRuleDto[]> {
  try {
    const { data } = await api.get<BankRuleDto[]>('/bank/rules');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function createBankRule(body: {
  matchText: string;
  isRegex: boolean;
  caseSensitive: boolean;
  categoryId: number;
  transactionType: string;
  priority: number;
  description?: string | null;
  autoPostCredits: boolean;
}): Promise<{ id: number }> {
  try {
    const { data } = await api.post<{ id: number }>('/bank/rules', body);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function updateBankRule(
  id: number,
  body: {
    matchText: string;
    isRegex: boolean;
    caseSensitive: boolean;
    categoryId: number;
    transactionType: string;
    priority?: number | null;
    description?: string | null;
    autoPostCredits: boolean;
  }
): Promise<void> {
  try {
    await api.put(`/bank/rules/${id}`, body);
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function deleteBankRule(id: number): Promise<void> {
  try {
    await api.delete(`/bank/rules/${id}`);
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function testBankRule(body: {
  matchText: string;
  isRegex: boolean;
  caseSensitive: boolean;
  text: string;
}): Promise<{ matches: boolean }> {
  try {
    const { data } = await api.post<{ matches: boolean }>('/bank/rules/test', body);
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

/* ── Personal Finance Settings ── */

export async function getPersonalFinanceSettings(): Promise<PersonalFinanceSettingsDto> {
  try {
    const { data } = await api.get<PersonalFinanceSettingsDto>('/personal-finance/settings');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function updatePersonalFinanceSettings(
  launchDate: string
): Promise<{ launchDateUtc: string; updatedAtUtc: string }> {
  try {
    const { data } = await api.put<{ launchDateUtc: string; updatedAtUtc: string }>(
      '/personal-finance/settings',
      { launchDate }
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function resetPersonalFinanceData(): Promise<ResetResultDto> {
  try {
    const { data } = await api.post<ResetResultDto>('/personal-finance/reset', {
      confirmation: 'RESET'
    });
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}
