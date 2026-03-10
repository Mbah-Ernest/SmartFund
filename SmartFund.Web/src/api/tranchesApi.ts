import { api } from './axios';
import { toApiClientError } from './apiError';
import type {
  CreateTrancheRequest,
  CreateTrancheResponse,
  FundOrUseResponse,
  FundTrancheRequest,
  PayoutTrancheRequest,
  SignTrancheAgreementRequest,
  SignTrancheAgreementResponse,
  TrancheDto
} from '../types/api';

export async function getTranches(): Promise<TrancheDto[]> {
  try {
    const { data } = await api.get<TrancheDto[]>('/tranches');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function createTranche(
  request: CreateTrancheRequest
): Promise<CreateTrancheResponse> {
  try {
    const { data } = await api.post<CreateTrancheResponse>('/tranches', request);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function fundTranche(
  trancheId: number,
  request: FundTrancheRequest
): Promise<FundOrUseResponse> {
  try {
    const { data } = await api.post<FundOrUseResponse>(
      `/tranches/${trancheId}/fund`,
      request
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function payoutTranche(
  trancheId: number,
  request: PayoutTrancheRequest
): Promise<FundOrUseResponse> {
  try {
    const { data } = await api.post<FundOrUseResponse>(
      `/tranches/${trancheId}/payout`,
      request
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function signTrancheAgreement(
  trancheId: number,
  request: SignTrancheAgreementRequest
): Promise<SignTrancheAgreementResponse> {
  try {
    const { data } = await api.post<SignTrancheAgreementResponse>(
      `/tranches/${trancheId}/agreement`,
      request
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}
