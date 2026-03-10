import { api } from './axios';
import { toApiClientError } from './apiError';
import type { CreateInvestorRequest, InvestorDto } from '../types/api';

export async function getInvestors(): Promise<InvestorDto[]> {
  try {
    const { data } = await api.get<InvestorDto[]>('/investors');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getInvestor(id: number): Promise<InvestorDto> {
  try {
    const { data } = await api.get<InvestorDto>(`/investors/${id}`);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function createInvestor(
  request: CreateInvestorRequest
): Promise<InvestorDto> {
  try {
    const { data } = await api.post<InvestorDto>('/investors', request);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}
