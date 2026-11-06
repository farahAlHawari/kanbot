import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import kanbotIcon from '../../assets/brand/kanbot-icon.svg';
import { configureApiAuth } from '../../shared/api/api-client';
import { ApiError } from '../../shared/api/errors';
import type { User } from '../../shared/types/api';
import { login as loginRequest, me, register as registerRequest } from './api/auth-api';
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
  const [token, setToken] = useState<string | null>(() => readToken());
  const [isLoading, setIsLoading] = useState(() => Boolean(readToken()));
  const [sessionError, setSessionError] = useState<string | null>(null);
  const expirationHandled = useRef(false);

  const expireSession = useCallback(() => {
    if (expirationHandled.current) return;
    expirationHandled.current = true;
    storeToken(null);
    setToken(null);
    setUser(null);
    setSessionError(SESSION_EXPIRED_MESSAGE);
    queryClient.clear();
    const isGuestPage = window.location.pathname === '/login' || window.location.pathname === '/register';
    const params = new URLSearchParams({ expired: '1' });
    if (!isGuestPage) {
      params.set('redirect', `${window.location.pathname}${window.location.search}${window.location.hash}`);
    }
    window.location.replace(`/login?${params.toString()}`);
  }, [queryClient]);

  useEffect(() => {
    configureApiAuth({ getToken: readToken, onUnauthorized: expireSession });
    const token = readToken();
    if (!token) return () => configureApiAuth(null);

    void me()
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        setSessionError(null);
      })
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
    setToken(result.token);
    setSessionError(null);
    setUser(result.user);
    expirationHandled.current = false;
    return result.user;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await registerRequest({ name, email, password });
    storeToken(result.token);
    setToken(result.token);
    setSessionError(null);
    setUser(result.user);
    expirationHandled.current = false;
    return result.user;
  }, []);

  const logout = useCallback(() => {
    storeToken(null);
    setToken(null);
    setUser(null);
    setSessionError(null);
    queryClient.clear();
    window.location.replace('/login');
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      status: isLoading ? 'loading' : user ? 'authenticated' : 'unauthenticated',
      isLoading,
      sessionError,
      login,
      register,
      logout,
    }),
    [user, token, isLoading, sessionError, login, register, logout],
  );

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }} aria-label="Loading session">
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Box component="img" src={kanbotIcon} alt="Kanbot" sx={{ width: 56, height: 56, animation: 'sparkle-pulse 1.6s ease-in-out infinite alternate', '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }} />
          <CircularProgress aria-label="Loading" size={24} />
          <Typography variant="body2" color="text.secondary">Restoring your session…</Typography>
        </Stack>
      </Box>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}