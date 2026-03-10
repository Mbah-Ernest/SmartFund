import { api } from './axios';
import { toApiClientError } from './apiError';
import type { LoginRequest, LoginResponse } from '../types/api';

export async function login(request: LoginRequest): Promise<LoginResponse> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', request);
    return data;
  } catch (error) {
    throw toApiClientError(error);
  }
}
