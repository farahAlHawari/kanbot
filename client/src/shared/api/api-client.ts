import { ApiError, toApiError } from './errors';
import type { ErrorCode } from '../types/api';

type ApiAuthHandlers = {
  getToken: () => string | null;
  onUnauthorized: () => void;
};

let authHandlers: ApiAuthHandlers | null = null;

export function configureApiAuth(handlers: ApiAuthHandlers | null): void {
  authHandlers = handlers;
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: HeadersInit;
  authenticated?: boolean;
}

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, authenticated = true, ...init } = options;
  const requestHeaders = new Headers(headers);
  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');

  if (authenticated) {
    const token = authHandlers?.getToken();
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: requestHeaders,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Is it running?');
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  let responseBody: unknown;
  try {
    responseBody = contentType.includes('application/json') ? await response.json() : await response.text();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const error = toApiError(response.status, responseBody);
    if (response.status === 401 && authenticated && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
      authHandlers?.onUnauthorized();
    }
    throw error;
  }

  return responseBody as T;
}

export function isApiErrorCode(error: unknown, code: ErrorCode): error is ApiError {
  return error instanceof ApiError && error.code === code;
}