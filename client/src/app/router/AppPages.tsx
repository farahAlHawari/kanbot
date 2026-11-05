import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import ViewKanbanOutlined from '@mui/icons-material/ViewKanbanOutlined';
import ViewListOutlined from '@mui/icons-material/ViewListOutlined';
import {
  Alert,
  AppBar,
  Box,
  Breadcrumbs,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { Link as RouterLink, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import kanbotLogo from '../../assets/kanbot-logo.svg';
import { useAuth } from '../../features/auth';
import { useProjects } from '../../features/projects';

function getPageTitle(pathname: string): string {
  if (pathname === '/projects') return 'Projects';
  if (pathname.endsWith('/backlog')) return 'Backlog';
  if (pathname.endsWith('/board')) return 'Board';
  if (pathname.endsWith('/sprints')) return 'Sprints';
  if (pathname.includes('/sprints/')) return 'Sprint details';
  return 'Kanbot';
}

function ProjectSwitcher({ mobile = false }: { mobile?: boolean }) {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const projectsQuery = useProjects();
  const projects = projectsQuery.data?.projects ?? [];
  const selectedProjectExists = projects.some((project) => project.id === projectId);

  function switchProject(nextProjectId: string) {
    if (!nextProjectId) return;
    const projectPath = location.pathname.match(/^\/projects\/[^/]+(\/.*)?$/);
    const remainder = projectPath?.[1];
    navigate(remainder ? `/projects/${nextProjectId}${remainder}` : `/projects/${nextProjectId}/backlog`);
  }

  return (
    <TextField
      select
      fullWidth
      size="small"
      label="Project"
      value={selectedProjectExists ? projectId : ''}
      disabled={projectsQuery.isLoading || projects.length === 0}
      onChange={(event) => switchProject(event.target.value)}
      error={projectsQuery.isError}
      helperText={projectsQuery.isError ? 'Projects could not be loaded.' : undefined}
      sx={{ mt: mobile ? 0 : 1, mb: mobile ? 0 : 2, minWidth: mobile ? 150 : undefined }}
    >
      {!selectedProjectExists ? (
        <MenuItem value="">
          <em>{projectsQuery.isLoading ? 'Loading projects…' : 'Select a project'}</em>
        </MenuItem>
      ) : null}
      {projects.map((project) => (
        <MenuItem key={project.id} value={project.id}>
          {project.name} ({project.key})
        </MenuItem>
      ))}
    </TextField>
  );
}

function ProjectNav({ projectId }: { projectId: string }) {
  const projectBase = `/projects/${projectId}`;
  const { pathname } = useLocation();
  const items = [
    { label: 'Backlog', to: `${projectBase}/backlog`, icon: <ViewListOutlined /> },
    { label: 'Board', to: `${projectBase}/board`, icon: <ViewKanbanOutlined /> },
    { label: 'Sprints', to: `${projectBase}/sprints`, icon: <CalendarMonthOutlined /> },
  ];

  return (
    <List dense disablePadding>
      {items.map(({ label, to, icon }) => (
        <ListItemButton
          key={to}
          component={RouterLink}
          to={to}
          className={pathname.startsWith(to) ? 'active' : ''}
          sx={{
            borderRadius: 1,
            '&.active': { bgcolor: 'action.selected', color: 'primary.main' },
            '&.active .MuiListItemIcon-root': { color: 'primary.main' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 38 }}>{icon}</ListItemIcon>
          <ListItemText primary={label} />
        </ListItemButton>
      ))}
    </List>
  );
}

function PageBreadcrumbs({ projectName, projectId, title }: { projectName?: string; projectId?: string; title: string }) {
  if (!projectId || !projectName) return null;
  return (
    <Breadcrumbs aria-label="Breadcrumbs" sx={{ mt: 0.25 }}>
      <Typography component={RouterLink} to="/projects" variant="body2" color="text.secondary" sx={{ textDecoration: 'none' }}>
        Projects
      </Typography>
      <Typography
        component={RouterLink}
        to={`/projects/${projectId}/backlog`}
        variant="body2"
        color="text.secondary"
        sx={{ textDecoration: 'none' }}
      >
        {projectName}
      </Typography>
      <Typography variant="body2" color="text.primary">{title}</Typography>
    </Breadcrumbs>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const title = getPageTitle(location.pathname);
  const projectsQuery = useProjects();
  const project = projectsQuery.data?.projects.find((item) => item.id === projectId);

  function createProject() {
    navigate('/projects?create=1');
  }

  const sidebar = (
    <Box
      component="aside"
      sx={{
        width: 256,
        flexShrink: 0,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: 2,
      }}
    >
      <Box component={RouterLink} to="/projects" sx={{ display: 'block', mb: 2, lineHeight: 0 }}>
        <Box component="img" src={kanbotLogo} alt="Kanbot" sx={{ width: 168, height: 'auto' }} />
      </Box>
      <Typography variant="overline" color="text.secondary">Workspace</Typography>
      <ProjectSwitcher />
      <List dense disablePadding sx={{ mb: 1 }}>
        <ListItemButton
          component={RouterLink}
          to="/projects"
          className={location.pathname === '/projects' ? 'active' : ''}
          sx={{ borderRadius: 1, '&.active': { bgcolor: 'action.selected', color: 'primary.main' } }}
        >
          <ListItemIcon sx={{ minWidth: 38 }}><FolderOutlined /></ListItemIcon>
          <ListItemText primary="All projects" />
        </ListItemButton>
      </List>
      {projectId ? (
        <>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="overline" color="text.secondary" sx={{ px: 2 }}>
            {project?.name ?? 'Project'}
          </Typography>
          <ProjectNav projectId={projectId} />
        </>
      ) : null}
      <Box sx={{ flex: 1 }} />
      <Divider sx={{ mb: 1 }} />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.name}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{user?.email}</Typography>
      <Button onClick={logout} color="inherit" sx={{ justifyContent: 'flex-start', mt: 1, px: 1 }}>
        Log out
      </Button>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      {sidebar}
      <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar sx={{ gap: 2, justifyContent: 'space-between', flexWrap: 'wrap', py: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h3">{title}</Typography>
              <PageBreadcrumbs projectName={project?.name} projectId={projectId} title={title} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', ml: 'auto' }}>
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <ProjectSwitcher mobile />
              </Box>
              <Tooltip title="The AI assistant will be available in a later phase">
                <span>
                  <Button variant="outlined" startIcon={<AutoAwesomeOutlined />} disabled>
                    Ask AI
                  </Button>
                </span>
              </Tooltip>
              <Button variant="contained" onClick={createProject}>New project</Button>
              <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">{user?.name}</Typography>
                <Button onClick={logout} color="inherit">Log out</Button>
              </Box>
            </Box>
            {projectId ? (
              <Box sx={{ display: { xs: 'flex', md: 'none' }, width: '100%', gap: 0.5 }}>
                <ProjectNav projectId={projectId} />
              </Box>
            ) : null}
          </Toolbar>
        </AppBar>
        {projectsQuery.isError && !location.pathname.startsWith('/projects') ? (
          <Alert severity="warning" sx={{ m: 2 }}>Project navigation could not be loaded. Please try again.</Alert>
        ) : null}
        <Box component="main" sx={{ p: { xs: 2, md: 4 }, flex: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export function AppLayout() {
  return <AppShell />;
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
