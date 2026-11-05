import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { configureApiAuth } from '../../shared/api/api-client';
import { ApiError } from '../../shared/api/errors';
import type { User } from '../../shared/types/api';
import { getCurrentUser, login as loginRequest, register as registerRequest } from './api/auth-api';
import { AuthContext, type AuthContextValue } from './hooks/auth-context';

const TOKEN_KEY = 'kanbot-token';
const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

function readToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string | null): void {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(readToken()));
  const [sessionError, setSessionError] = useState<string | null>(null);

  const expireSession = useCallback(() => {
    storeToken(null);
    setUser(null);
    setSessionError(SESSION_EXPIRED_MESSAGE);
    queryClient.clear();
    const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const search = new URLSearchParams({ redirect, expired: '1' });
    window.location.replace(`/login?${search.toString()}`);
  }, [queryClient]);

  useEffect(() => {
    configureApiAuth({ getToken: readToken, onUnauthorized: expireSession });
    const token = readToken();
    if (!token) return () => configureApiAuth(null);

    void getCurrentUser()
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status !== 401) {
          setSessionError(error.message);
        }
      })
      .finally(() => setIsLoading(false));

    return () => configureApiAuth(null);
  }, [expireSession]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest({ email, password });
    storeToken(result.token);
    setSessionError(null);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await registerRequest({ name, email, password });
    storeToken(result.token);
    setSessionError(null);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    storeToken(null);
    setUser(null);
    setSessionError(null);
    queryClient.clear();
    window.location.replace('/login');
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, sessionError, login, register, logout }),
    [user, isLoading, sessionError, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}