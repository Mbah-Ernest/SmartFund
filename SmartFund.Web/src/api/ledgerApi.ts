import { api } from './axios';
import { toApiClientError } from './apiError';
import type {
  CreateLedgerAccountRequest,
  CreateLedgerTransactionRequest,
  CreateLedgerTransactionResponse,
  FundOrUseResponse,
  LedgerAccountDto,
  LedgerTransactionListItemDto,
  LedgerTransactionDto,
  PostLedgerTransactionRequest,
  PostLedgerTransactionResponse
} from '../types/api';

export async function createLedgerTransactionDraft(
  request: CreateLedgerTransactionRequest
): Promise<CreateLedgerTransactionResponse> {
  try {
    const { data } = await api.post<CreateLedgerTransactionResponse>(
      '/ledger/transactions',
      request
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getLedgerTransaction(
  transactionId: number
): Promise<LedgerTransactionDto> {
  try {
    const { data } = await api.get<LedgerTransactionDto>(
      `/ledger/transactions/${transactionId}`
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function postLedgerTransaction(
  transactionId: number,
  request: PostLedgerTransactionRequest
): Promise<PostLedgerTransactionResponse> {
  try {
    const { data } = await api.post<PostLedgerTransactionResponse>(
      `/ledger/transactions/${transactionId}/post`,
      request
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getLedgerAccounts(): Promise<LedgerAccountDto[]> {
  try {
    const { data } = await api.get<LedgerAccountDto[]>('/ledger/accounts');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function createLedgerAccount(
  request: CreateLedgerAccountRequest
): Promise<LedgerAccountDto> {
  try {
    const { data } = await api.post<LedgerAccountDto>('/ledger/accounts', request);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getLedgerTransactions(): Promise<LedgerTransactionListItemDto[]> {
  try {
    const { data } = await api.get<LedgerTransactionListItemDto[]>(
      '/ledger/transactions'
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}
