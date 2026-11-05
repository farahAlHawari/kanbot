import { request } from '../../../shared/api/api-client';
import type { AuthResponse, LoginRequest, MeResponse, RegisterRequest } from '../../../shared/types/api';

export const login = (input: LoginRequest) =>
  request<AuthResponse>('/auth/login', { method: 'POST', body: input, authenticated: false });

export const register = (input: RegisterRequest) =>
  request<AuthResponse>('/auth/register', { method: 'POST', body: input, authenticated: false });

export const me = () => request<MeResponse>('/auth/me');