import { api } from './axios';
import { toApiClientError } from './apiError';
import type {
  FundInsuranceRequest,
  FundOrUseResponse,
  UseInsuranceRequest
} from '../types/api';

export async function fundInsuranceWallet(
  request: FundInsuranceRequest
): Promise<FundOrUseResponse> {
  try {
    const { data } = await api.post<FundOrUseResponse>('/insurance/fund', request);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function useInsuranceWallet(
  request: UseInsuranceRequest
): Promise<FundOrUseResponse> {
  try {
    const { data } = await api.post<FundOrUseResponse>('/insurance/use', request);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}
