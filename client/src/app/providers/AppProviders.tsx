import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, InitColorSchemeScript } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { RouterProvider } from 'react-router-dom';
import { FeedbackProvider } from './FeedbackProvider';
import { theme } from '../theme/theme';
import { router } from '../router/router';
import { AuthProvider } from '../../features/auth';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    mutations: { retry: false },
  },
});

export function AppProviders() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <InitColorSchemeScript attribute="data" defaultMode="light" />
        <ThemeProvider theme={theme} defaultMode="light" disableTransitionOnChange>
          <CssBaseline enableColorScheme />
          <FeedbackProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </FeedbackProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}