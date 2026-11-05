import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { RouterProvider } from 'react-router-dom';
import { FeedbackProvider } from './FeedbackProvider';
import { theme } from '../theme/theme';
import { router } from '../router/router';
import { AuthProvider } from '../../features/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    mutations: { retry: false },
  },
});

export function AppProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FeedbackProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </FeedbackProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}