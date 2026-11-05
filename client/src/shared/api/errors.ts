import type { ApiErrorBody, ErrorCode } from '../types/api';

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'NETWORK_ERROR';
  readonly details: ApiErrorDetail[];

  constructor(status: number, code: ErrorCode | 'NETWORK_ERROR', message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(error.details.map(({ path, message }) => [path, message]));
}

export function toApiError(status: number, body: unknown): ApiError {
  const parsed = body as ApiErrorBody | null;
  const apiError = parsed?.error;
  if (apiError && typeof apiError.message === 'string') {
    return new ApiError(status, apiError.code, apiError.message, apiError.details ?? []);
  }
  return new ApiError(status, 'INTERNAL_ERROR', 'Something went wrong on our side.');
}