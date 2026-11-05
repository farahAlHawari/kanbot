import { useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Box, Button, CircularProgress, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, getFieldErrors } from '../../../shared/api/errors';
import { useAuth } from '../hooks/use-auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 440, p: { xs: 3, sm: 4 } }}>
        <Typography component="h1" variant="h1" sx={{ mb: 1 }}>{title}</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Your sprint board with an AI teammate.</Typography>
        {children}
      </Paper>
    </Box>
  );
}

function getRedirect(searchParams: URLSearchParams): string {
  const redirect = searchParams.get('redirect');
  return redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/projects';
}

export function LoginPage() {
  const { login, sessionError } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors: Record<string, string> = {};
    if (!email.trim()) nextErrors.email = 'Email is required.';
    else if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!password) nextErrors.password = 'Password is required.';
    setErrors(nextErrors);
    setServerError(null);
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(getRedirect(searchParams), { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Unable to log in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Welcome back">
      {searchParams.get('expired') === '1' ? (
        <Alert severity="warning" sx={{ mb: 2 }} role="alert">Your session has expired. Please log in again.</Alert>
      ) : sessionError ? (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">{sessionError}</Alert>
      ) : null}
      {serverError ? <Alert severity="error" sx={{ mb: 2 }} role="alert">{serverError}</Alert> : null}
      <Box component="form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            fullWidth
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email || ' '}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            fullWidth
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password || ' '}
          />
          <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
            {isSubmitting ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />Logging in…</> : 'Log in'}
          </Button>
        </Stack>
      </Box>
      <Typography sx={{ mt: 3, textAlign: 'center' }}>
        New to Kanbot? <Link component={RouterLink} to="/register">Create an account</Link>
      </Typography>
    </AuthCard>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Name is required.';
    if (!email.trim()) nextErrors.email = 'Email is required.';
    else if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!password) nextErrors.password = 'Password is required.';
    else if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.';
    else if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match.';
    setErrors(nextErrors);
    setServerError(null);
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/projects', { replace: true });
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      if (error instanceof ApiError && error.status === 409) {
        setErrors((previous) => ({
          ...previous,
          email: fieldErrors.email ?? 'An account with this email already exists.',
        }));
      } else if (Object.keys(fieldErrors).length) {
        setErrors((previous) => ({ ...previous, ...fieldErrors }));
      } else {
        setServerError(error instanceof ApiError ? error.message : 'Unable to create your account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Create your account">
      {serverError ? <Alert severity="error" sx={{ mb: 2 }} role="alert">{serverError}</Alert> : null}
      <Box component="form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <Stack spacing={2}>
          <TextField
            label="Name"
            autoComplete="name"
            autoFocus
            fullWidth
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name || ' '}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            fullWidth
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email || ' '}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            fullWidth
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password || ' '}
          />
          <TextField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            fullWidth
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword || ' '}
          />
          <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
            {isSubmitting ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />Creating account…</> : 'Create account'}
          </Button>
        </Stack>
      </Box>
      <Typography sx={{ mt: 3, textAlign: 'center' }}>
        Already have an account? <Link component={RouterLink} to="/login">Log in</Link>
      </Typography>
    </AuthCard>
  );
}
