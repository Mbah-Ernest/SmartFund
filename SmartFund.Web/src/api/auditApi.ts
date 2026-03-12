import { api } from './axios';
import { toApiClientError } from './apiError';
import type {
  AuditEntryDto,
  ReverseAuditEntryRequest,
  ReverseAuditEntryResponse
} from '../types/api';

export async function getInvestmentAuditLog(): Promise<AuditEntryDto[]> {
  try {
    const { data } = await api.get<AuditEntryDto[]>('/audit/investment');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getPersonalAuditLog(): Promise<AuditEntryDto[]> {
  try {
    const { data } = await api.get<AuditEntryDto[]>('/audit/personal');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function reverseAuditEntry(
  id: number,
  request: ReverseAuditEntryRequest
): Promise<ReverseAuditEntryResponse> {
  try {
    const { data } = await api.post<ReverseAuditEntryResponse>(
      `/audit/${id}/reverse`,
      request
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}
