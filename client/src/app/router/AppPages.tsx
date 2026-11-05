import { AppBar, Box, Button, Container, Link, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../features/auth';

function getPageTitle(pathname: string): string {
  if (pathname === '/projects') return 'Projects';
  if (pathname.endsWith('/backlog')) return 'Backlog';
  if (pathname.endsWith('/board')) return 'Sprint board';
  if (pathname.endsWith('/sprints')) return 'Sprints';
  if (pathname.includes('/sprints/')) return 'Sprint details';
  return 'Kanbot';
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { projectId } = useParams();
  const projectBase = projectId ? `/projects/${projectId}` : '/projects';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography component={RouterLink} to="/projects" variant="h3" color="primary" sx={{ textDecoration: 'none', mr: 'auto' }}>
            Kanbot
          </Typography>
          <Link component={RouterLink} to="/projects" underline="hover" color="text.primary">Projects</Link>
          {projectId ? (
            <>
              <Link component={RouterLink} to={`${projectBase}/backlog`} underline="hover" color="text.primary">Backlog</Link>
              <Link component={RouterLink} to={`${projectBase}/board`} underline="hover" color="text.primary">Board</Link>
              <Link component={RouterLink} to={`${projectBase}/sprints`} underline="hover" color="text.primary">Sprints</Link>
            </>
          ) : null}
          <Typography color="text.secondary">{user?.name}</Typography>
          <Button onClick={logout} color="inherit">Log out</Button>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        <Typography component="h1" variant="h1" sx={{ mb: 3 }}>{getPageTitle(location.pathname)}</Typography>
        <Outlet />
      </Container>
    </Box>
  );
}

export function RoutePlaceholder() {
  const location = useLocation();
  return (
    <Typography color="text.secondary">
      This Kanbot page is ready at <code>{location.pathname}</code>.
    </Typography>
  );
}

export function NotFoundPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography component="h1" variant="h1" gutterBottom>Page not found</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>The page you are looking for does not exist.</Typography>
        <Button component={RouterLink} to="/" variant="contained">Go to Kanbot</Button>
      </Box>
    </Box>
  );
}

export function ProjectBacklogRedirect() {
  const { projectId } = useParams();
  return <Navigate to={`/projects/${encodeURIComponent(projectId ?? '')}/backlog`} replace />;
}
