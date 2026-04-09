import { api } from './axios';
import { toApiClientError } from './apiError';
import type {
  LoanApplicantProfileDto,
  LoanApplicationDto,
  RejectLoanApplicantRequest,
  ReviewLoanRequest,
  SubmitLoanApplicantRequest,
  SubmitLoanRequest,
  UserCreditInsightsDto,
  UserSummaryDto,
  VerifyLoanApplicantRequest,
} from '../types/api';

// Member endpoints
export async function submitLoan(request: SubmitLoanRequest): Promise<LoanApplicationDto> {
  try {
    const { data } = await api.post<LoanApplicationDto>('/loans', request);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getMyLoans(): Promise<LoanApplicationDto[]> {
  try {
    const { data } = await api.get<LoanApplicationDto[]>('/loans/my');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function getMyApplicantProfile(): Promise<LoanApplicantProfileDto | null> {
  try {
    const { data } = await api.get<LoanApplicantProfileDto | null>('/loans/applicants/me');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function submitApplicantProfile(request: SubmitLoanApplicantRequest): Promise<LoanApplicantProfileDto> {
  try {
    const { data } = await api.post<LoanApplicantProfileDto>('/loans/applicants', request);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

// Admin endpoints
export async function adminListLoans(status?: string): Promise<LoanApplicationDto[]> {
  try {
    const params: Record<string, string | number> = {};
    if (status) params.status = status;
    const { data } = await api.get<LoanApplicationDto[]>('/loans', { params });
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function adminStartReviewLoan(id: number): Promise<void> {
  try {
    await api.post(`/loans/${id}/review`);
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function adminApproveLoan(id: number, request: ReviewLoanRequest): Promise<void> {
  try {
    await api.post(`/loans/${id}/approve`, request);
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function adminRejectLoan(id: number, request: ReviewLoanRequest): Promise<void> {
  try {
    await api.post(`/loans/${id}/reject`, request);
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function adminDisburseLoan(id: number): Promise<void> {
  try {
    await api.post(`/loans/${id}/disburse`);
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function adminListApplicants(status?: string): Promise<LoanApplicantProfileDto[]> {
  try {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const { data } = await api.get<LoanApplicantProfileDto[]>('/loans/applicants', { params });
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function adminVerifyApplicant(id: number, request: VerifyLoanApplicantRequest): Promise<void> {
  try {
    await api.post(`/loans/applicants/${id}/verify`, request);
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function adminRejectApplicant(id: number, request: RejectLoanApplicantRequest): Promise<void> {
  try {
    await api.post(`/loans/applicants/${id}/reject`, request);
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function adminListUsers(): Promise<UserSummaryDto[]> {
  try {
    const { data } = await api.get<UserSummaryDto[]>('/admin/users');
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function adminGetInsights(userId: number): Promise<UserCreditInsightsDto> {
  try {
    const { data } = await api.get<UserCreditInsightsDto>(`/admin/users/${userId}/insights`);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}
