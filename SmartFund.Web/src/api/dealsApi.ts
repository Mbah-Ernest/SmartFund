import { api } from './axios';
import { toApiClientError } from './apiError';
import type { CreateDealRequest, CreateDealResponse, DealDto } from '../types/api';

export async function getDeals(): Promise<DealDto[]> {
  try {
    const { data } = await api.get<DealDto[]>('/deals');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getDeal(id: number): Promise<DealDto> {
  try {
    const { data } = await api.get<DealDto>(`/deals/${id}`);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function createDeal(
  request: CreateDealRequest
): Promise<CreateDealResponse> {
  try {
    const { data } = await api.post<CreateDealResponse>('/deals', request);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}
