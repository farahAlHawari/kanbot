import { useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, getFieldErrors } from '../../../shared/api/errors';
import { useAuth } from '../hooks/use-auth';
import kanbotLogo from '../../../assets/brand/kanbot-logo.svg';
import kanbotLogoDark from '../../../assets/brand/kanbot-logo-dark.svg';
import { useLocale } from '../../../app/providers/use-locale';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { t } = useLocale();
  return (
    <Box className="auth-page" sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: { xs: 2, sm: 3, lg: 5 } }}>
      <Paper variant="outlined" className="auth-layout" sx={{ width: '100%', maxWidth: { xs: 440, lg: 1080 }, overflow: 'hidden', display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '45% 55%' } }}>
        <Box sx={{ p: { xs: 3, sm: 4, lg: 5 }, alignSelf: 'center' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: { xs: 4, lg: 5 } }}>
            <Box component={RouterLink} to="/projects" aria-label="Kanbot home" sx={{ display: 'inline-flex' }}>
              <Box component="img" className="brand-auth-logo brand-logo-light" src={kanbotLogo} alt="Kanbot" sx={{ width: { xs: 132, sm: 148 }, height: 'auto' }} />
              <Box component="img" className="brand-auth-logo brand-logo-dark" src={kanbotLogoDark} alt="Kanbot" sx={{ width: { xs: 132, sm: 148 }, height: 'auto' }} />
            </Box>
          </Stack>
          <Typography component="h1" variant="h1" sx={{ mb: 0.75 }}>{t(title)}</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>{t(subtitle)}</Typography>
          <Box className="auth-form">{children}</Box>
        </Box>
        <Box className="auth-hero" sx={{ display: { xs: 'none', lg: 'flex' }, position: 'relative', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden', p: { lg: 4, xl: 5 }, bgcolor: 'background.subtle' }}>
          <Typography variant="h2" sx={{ textAlign: 'center' }}>{t('Your sprint board with an AI teammate.')}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>{t('Plan sprints. Ship calmly.')}</Typography>
          <Box component="svg" viewBox="0 0 480 300" role="img" aria-label="A calm sprint board with an AI teammate" sx={{ width: '100%', maxHeight: 300, overflow: 'visible' }}>
            <rect x="34" y="52" width="128" height="196" rx="18" fill="var(--mui-palette-background-paper)" stroke="var(--mui-palette-divider)" />
            <rect x="176" y="52" width="128" height="196" rx="18" fill="var(--mui-palette-background-paper)" stroke="var(--mui-palette-divider)" />
            <rect x="318" y="52" width="128" height="196" rx="18" fill="var(--mui-palette-background-paper)" stroke="var(--mui-palette-divider)" />
            <rect x="50" y="76" width="96" height="54" rx="10" fill="var(--mui-palette-background-subtle)" />
            <rect x="50" y="142" width="96" height="74" rx="10" fill="var(--mui-palette-background-subtle)" />
            <rect x="192" y="76" width="96" height="74" rx="10" fill="var(--mui-palette-brand-50)" />
            <rect x="192" y="162" width="96" height="54" rx="10" fill="var(--mui-palette-background-subtle)" />
            <rect x="334" y="76" width="96" height="54" rx="10" fill="var(--mui-palette-brand-50)" />
            <rect x="334" y="142" width="96" height="74" rx="10" fill="var(--mui-palette-background-subtle)" />
            <circle cx="414" cy="48" r="13" fill="var(--mui-palette-accent-main)" />
            <path d="M75 100h44M75 115h30M75 165h44M75 181h36M217 101h42M217 118h31M359 166h42M359 184h34" stroke="var(--mui-palette-text-muted)" strokeWidth="5" strokeLinecap="round" />
            <circle cx="252" cy="139" r="5" fill="var(--mui-palette-primary-main)" />
          </Box>
          <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['Backlog', 'Sprints', 'AI assistant'].map((feature) => (
              <Chip key={feature} size="small" variant="outlined" label={t(feature)} />
            ))}
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

function getRedirect(searchParams: URLSearchParams): string {
  const redirect = searchParams.get('redirect');
  return redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/projects';
}

export function LoginPage() {
  const { t } = useLocale();
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
    if (!email.trim()) nextErrors.email = t('Email is required.');
    else if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = t('Enter a valid email address.');
    if (!password) nextErrors.password = t('Password is required.');
    setErrors(nextErrors);
    setServerError(null);
    if (Object.keys(nextErrors).length) return;

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(getRedirect(searchParams), { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : t('Unable to log in. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Log in to continue to your sprint board.">
      {searchParams.get('expired') === '1' ? (
        <Alert severity="warning" sx={{ mb: 2 }} role="alert">{t('Your session has expired. Please log in again.')}</Alert>
      ) : sessionError ? (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">{sessionError}</Alert>
      ) : null}
      {serverError ? <Alert severity="error" sx={{ mb: 2 }} role="alert">{serverError}</Alert> : null}
      <Box component="form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <Stack spacing={2}>
          <TextField
            className="auth-field"
            label={t('Email')}
            type="email"
            variant="outlined"
            autoComplete="email"
            autoFocus
            fullWidth
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email || ' '}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            className="auth-field"
            label={t('Password')}
            type="password"
            variant="outlined"
            autoComplete="current-password"
            fullWidth
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password || ' '}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
            {isSubmitting ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />{t('Logging in…')}</> : t('Log in')}
          </Button>
        </Stack>
      </Box>
      <Typography sx={{ mt: 3, textAlign: 'center' }}>
        {t('New to Kanbot?')} <Link component={RouterLink} to="/register">{t('Create an account')}</Link>
      </Typography>
    </AuthCard>
  );
}

export function RegisterPage() {
  const { t } = useLocale();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const passwordStrengthLabel = t(passwordStrength === 0 ? 'Use at least 8 characters.' : passwordStrength === 1 ? 'Short password' : passwordStrength === 2 ? 'Fair password' : 'Strong password');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = t('Name is required.');
    if (!email.trim()) nextErrors.email = t('Email is required.');
    else if (!EMAIL_PATTERN.test(email.trim())) nextErrors.email = t('Enter a valid email address.');
    if (!password) nextErrors.password = t('Password is required.');
    else if (password.length < 8) nextErrors.password = t('Password must be at least 8 characters.');
    if (!confirmPassword) nextErrors.confirmPassword = t('Please confirm your password.');
    else if (confirmPassword !== password) nextErrors.confirmPassword = t('Passwords do not match.');
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
        setServerError(error instanceof ApiError ? error.message : t('Unable to create your account. Please try again.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Set up your workspace and start planning your next sprint.">
      {serverError ? <Alert severity="error" sx={{ mb: 2 }} role="alert">{serverError}</Alert> : null}
      <Box component="form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <Stack spacing={2}>
          <TextField
            className="auth-field"
            label={t('Name')}
            variant="outlined"
            autoComplete="name"
            autoFocus
            fullWidth
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name || ' '}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            className="auth-field"
            label={t('Email')}
            type="email"
            variant="outlined"
            autoComplete="email"
            fullWidth
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email || ' '}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            className="auth-field"
            label={t('Password')}
            type="password"
            variant="outlined"
            autoComplete="new-password"
            fullWidth
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password || ' '}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Box aria-live="polite" sx={{ mt: -1 }}>
            <Stack direction="row" spacing={0.75} sx={{ mb: 0.5 }} aria-label={passwordStrengthLabel}>
              {[1, 2, 3].map((segment) => (
                <Box
                  key={segment}
                  sx={{
                    height: 4,
                    flex: 1,
                    borderRadius: 'var(--radius-full)',
                    bgcolor: segment <= passwordStrength
                      ? passwordStrength === 1 ? 'error.main' : passwordStrength === 2 ? 'warning.main' : 'success.main'
                      : 'background.muted',
                  }}
                />
              ))}
            </Stack>
            <Typography variant="caption" color={passwordStrength < 2 && password ? 'error.main' : 'text.secondary'}>
              {passwordStrengthLabel}
            </Typography>
          </Box>
          <TextField
            className="auth-field"
            label={t('Confirm password')}
            type="password"
            variant="outlined"
            autoComplete="new-password"
            fullWidth
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword || ' '}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
            {isSubmitting ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />{t('Creating account…')}</> : t('Create account')}
          </Button>
        </Stack>
      </Box>
      <Typography sx={{ mt: 3, textAlign: 'center' }}>
        {t('Already have an account?')} <Link component={RouterLink} to="/login">{t('Log in')}</Link>
      </Typography>
    </AuthCard>
  );
}
