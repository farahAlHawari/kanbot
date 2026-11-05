import { CircularProgress, Box } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';

function AuthLoading() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }} aria-label="Loading session">
      <CircularProgress aria-label="Loading" />
    </Box>
  );
}

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <AuthLoading />;
  if (!user) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?${new URLSearchParams({ redirect })}`} replace />;
  }
  return <Outlet />;
}

export function GuestRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <AuthLoading />;
  const redirect = new URLSearchParams(location.search).get('redirect');
  const destination = redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/projects';
  return user ? <Navigate to={destination} replace /> : <Outlet />;
}