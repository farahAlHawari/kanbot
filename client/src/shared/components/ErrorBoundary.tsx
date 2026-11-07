import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';

interface Props {
  children: ReactNode;
  /** Rendered instead of the crash screen when provided. */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level React error boundary.
 * Catches render-phase exceptions and shows a friendly recovery UI.
 * Does NOT catch async errors (those are handled per-feature with TanStack Query).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console in development; replace with a real logger in production.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  override render() {
    if (this.props.fallback && this.state.error) return this.props.fallback;

    if (this.state.error) {
      return (
        <Box
          role="alert"
          sx={{
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          <Box sx={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <Typography component="h1" variant="h2" gutterBottom>
              Something went wrong
            </Typography>
            <Alert severity="error" sx={{ textAlign: 'left', mb: 2 }}>
              {this.state.error.message || 'An unexpected error occurred.'}
            </Alert>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Try reloading the page. If the problem persists, clear your browser
              cache or contact support.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={this.reset}>
                Try again
              </Button>
              <Button variant="outlined" onClick={() => window.location.reload()}>
                Reload page
              </Button>
            </Box>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
