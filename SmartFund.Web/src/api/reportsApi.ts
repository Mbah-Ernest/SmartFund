import { api } from './axios';
import { toApiClientError } from './apiError';
import type { InsuranceBufferReportDto } from '../types/api';

export async function getInsuranceBufferReport(): Promise<InsuranceBufferReportDto> {
  try {
    const { data } = await api.get<InsuranceBufferReportDto>(
      '/reports/insurance-buffer'
    );
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}
