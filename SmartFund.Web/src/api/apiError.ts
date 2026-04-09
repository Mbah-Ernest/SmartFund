import axios from 'axios';

export class ApiClientError extends Error {
  public readonly status?: number;
  public readonly details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

export function toApiClientError(error: unknown): ApiClientError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    const message =
      (typeof data === 'object' && data !== null && typeof (data as Record<string, unknown>).detail === 'string'
        ? (data as Record<string, unknown>).detail as string
        : undefined) ||
      (typeof data === 'object' && data !== null && typeof (data as Record<string, unknown>).error === 'string'
        ? (data as Record<string, unknown>).error as string
        : undefined) ||
      (typeof data === 'string' && data.trim().length > 0 ? data : undefined) ||
      error.message ||
      'Request failed.';

    return new ApiClientError(message, status, data);
  }

  if (error instanceof Error) {
    return new ApiClientError(error.message);
  }

  return new ApiClientError('Unknown error.');
}
