import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import ViewKanbanOutlined from '@mui/icons-material/ViewKanbanOutlined';
import ViewListOutlined from '@mui/icons-material/ViewListOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import WbSunnyOutlined from '@mui/icons-material/WbSunnyOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import { useState } from 'react';
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Breadcrumbs,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
} from '@mui/material';
import { useColorScheme } from '@mui/material/styles';
import { Link as RouterLink, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import kanbotLogo from '../../assets/brand/kanbot-logo.svg';
import kanbotLogoDark from '../../assets/brand/kanbot-logo-dark.svg';
import kanbotIcon from '../../assets/brand/kanbot-icon.svg';
import { useAuth } from '../../features/auth';
import { useProjects } from '../../features/projects';
import { AssistantDrawer } from '../../features/ai-assistant/components/AssistantDrawer';
import { useLocale } from '../providers/use-locale';

function getPageTitle(pathname: string, t: (text: string) => string): string {
  if (pathname === '/projects') return t('Projects');
  if (pathname.endsWith('/backlog')) return t('Backlog');
  if (pathname.endsWith('/board')) return t('Board');
  if (pathname.endsWith('/sprints')) return t('Sprints');
  if (pathname.includes('/sprints/')) return t('Sprint details');
  return 'Kanbot';
}

function ProjectSwitcher({ mobile = false }: { mobile?: boolean }) {
  const { t } = useLocale();
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
      label={t('Project')}
      value={selectedProjectExists ? projectId : ''}
      disabled={projectsQuery.isLoading || projects.length === 0}
      onChange={(event) => switchProject(event.target.value)}
      error={projectsQuery.isError}
      helperText={projectsQuery.isError ? t('Projects could not be loaded.') : undefined}
      sx={{ mt: mobile ? 0 : 1, mb: mobile ? 0 : 2, minWidth: mobile ? 150 : undefined }}
    >
      {!selectedProjectExists ? (
        <MenuItem value="">
          <em>{projectsQuery.isLoading ? t('Loading projects…') : t('Select a project')}</em>
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
  const { t } = useLocale();
  const projectBase = `/projects/${projectId}`;
  const { pathname } = useLocation();
  const items = [
    { label: t('Backlog'), to: `${projectBase}/backlog`, icon: <ViewListOutlined fontSize="small" /> },
    { label: t('Board'), to: `${projectBase}/board`, icon: <ViewKanbanOutlined fontSize="small" /> },
    { label: t('Sprints'), to: `${projectBase}/sprints`, icon: <CalendarMonthOutlined fontSize="small" /> },
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
            '&.active': {
              bgcolor: 'var(--primary-soft)',
              color: 'var(--primary-soft-text)',
              '&::before': { content: '""', position: 'absolute', left: 0, top: 6, bottom: 6, width: 2, borderRadius: 2, bgcolor: 'primary.main' },
            },
            '&.active .MuiListItemIcon-root': { color: 'primary.main' },
            '& .MuiListItemText-root': { display: { md: 'none', lg: 'block' } },
            justifyContent: { md: 'center', lg: 'flex-start' },
          }}
        >
          <ListItemIcon sx={{ minWidth: { md: 0, lg: 38 }, justifyContent: 'center' }}>{icon}</ListItemIcon>
          <ListItemText primary={label} />
        </ListItemButton>
      ))}
    </List>
  );
}

function ThemeControl() {
  const { t } = useLocale();
  const { mode, setMode } = useColorScheme();
  if (!mode) return null;
  const selectedMode = mode === 'dark' ? 'dark' : 'light';
  return (
    <ToggleButtonGroup
      value={selectedMode}
      exclusive
      size="small"
      aria-label={t('Color theme')}
      onChange={(_, nextMode: 'light' | 'dark' | null) => {
        if (nextMode) setMode(nextMode);
      }}
      sx={{ width: '100%', mt: 1, '& .MuiToggleButton-root': { flex: 1, minWidth: 0, px: 0.5, py: 0.5, fontSize: 11 } }}
    >
      <ToggleButton value="light" aria-label={t('Light theme')}><WbSunnyOutlined fontSize="small" /></ToggleButton>
      <ToggleButton value="dark" aria-label={t('Dark theme')}><DarkModeOutlined fontSize="small" /></ToggleButton>
    </ToggleButtonGroup>
  );
}

function ThemeCycleButton() {
  const { t } = useLocale();
  const { mode, setMode } = useColorScheme();
  if (!mode) return null;
  const nextMode = mode === 'dark' ? 'light' : 'dark';
  const Icon = mode === 'dark' ? DarkModeOutlined : WbSunnyOutlined;
  return (
    <Button
      aria-label={`${t('Theme')}: ${mode}. ${t('Switch to')} ${nextMode}`}
      title={`${t('Theme')}: ${mode}`}
      onClick={() => setMode(nextMode)}
      sx={{ minWidth: 40, width: 40, px: 0, display: { xs: 'inline-flex', lg: 'none' } }}
    >
      <Icon fontSize="small" />
    </Button>
  );
}

function MobileProjectNavigation({ projectId, pathname }: { projectId?: string; pathname: string }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const projectBase = projectId ? `/projects/${projectId}` : '';
  const items = [
    { label: t('Projects'), value: '/projects', icon: <FolderOutlined /> },
    ...(projectId ? [
      { label: t('Backlog'), value: `${projectBase}/backlog`, icon: <ViewListOutlined /> },
      { label: t('Board'), value: `${projectBase}/board`, icon: <ViewKanbanOutlined /> },
      { label: t('Sprints'), value: `${projectBase}/sprints`, icon: <CalendarMonthOutlined /> },
    ] : []),
  ];
  const active = projectId
    ? items.find((item) => item.value !== '/projects' && (pathname === item.value || pathname.startsWith(`${item.value}/`)))?.value ?? '/projects'
    : '/projects';
  return (
    <BottomNavigation
      showLabels
      value={active}
      onChange={(_, value: string) => navigate(value)}
      sx={{
        position: 'fixed',
        display: { xs: 'flex', md: 'none' },
        insetInline: 0,
        bottom: 0,
        zIndex: 10,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        pb: 'env(safe-area-inset-bottom)',
        '& .MuiBottomNavigationAction-root': { color: 'text.secondary', minWidth: 0, px: 0.5 },
        '& .MuiBottomNavigationAction-root.Mui-selected': { color: 'primary.main', bgcolor: 'action.selected' },
        '& .MuiBottomNavigationAction-root .MuiSvgIcon-root': { color: 'inherit' },
        '& .MuiBottomNavigationAction-root.Mui-selected .MuiSvgIcon-root': { color: 'primary.main' },
        '& .MuiBottomNavigationAction-label': { fontSize: 10 },
        '& .MuiBottomNavigationAction-label.Mui-selected': { fontSize: 10, fontWeight: 700 },
      }}
    >
      {items.map((item) => (
        <BottomNavigationAction
          key={item.value}
          label={item.label}
          value={item.value}
          icon={item.icon}
          aria-current={active === item.value ? 'page' : undefined}
        />
      ))}
    </BottomNavigation>
  );
}

function PageBreadcrumbs({ projectName, projectId, title }: { projectName?: string; projectId?: string; title: string }) {
  const { t } = useLocale();
  if (!projectId || !projectName) return null;
  return (
    <Breadcrumbs aria-label="Breadcrumbs" sx={{ mt: 0.25 }}>
      <Typography component={RouterLink} to="/projects" variant="body2" color="text.secondary" sx={{ textDecoration: 'none' }}>
        {t('Projects')}
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
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { t } = useLocale();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const title = getPageTitle(location.pathname, t);
  const projectsQuery = useProjects();
  const project = projectsQuery.data?.projects.find((item) => item.id === projectId);

  function createProject() {
    navigate('/projects?create=1');
  }

  const sidebar = (
    <Box
      component="aside"
      sx={{
        height: '100dvh',
        minHeight: 0,
        width: { md: 64, lg: 248 },
        flexShrink: 0,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        borderInlineEnd: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { md: 1, lg: 2 },
        overflow: 'hidden',
      }}
    >
      <Box component={RouterLink} to="/projects" aria-label="Kanbot home" sx={{ display: 'flex', justifyContent: { md: 'center', lg: 'flex-start' }, mb: 2, lineHeight: 0, flexShrink: 0 }}>
        <Box component="img" src={kanbotIcon} alt="Kanbot" sx={{ display: { md: 'block', lg: 'none' }, width: 40, height: 40 }} />
        <Box component="img" className="sidebar-logo brand-logo-light" src={kanbotLogo} alt="Kanbot" sx={{ width: 168, height: 'auto' }} />
        <Box component="img" className="sidebar-logo brand-logo-dark" src={kanbotLogoDark} alt="Kanbot" sx={{ width: 168, height: 'auto' }} />
      </Box>
      <Box component="nav" aria-label={t('Workspace')} sx={{ minHeight: 0, flex: 1, overflowY: 'auto', overscrollBehaviorY: 'contain' }}>
        <Typography variant="overline" color="text.secondary" sx={{ display: { md: 'none', lg: 'block' } }}>{t('Workspace')}</Typography>
        <Box sx={{ display: { md: 'none', lg: 'block' } }}><ProjectSwitcher /></Box>
        <List dense disablePadding sx={{ mb: 1 }}>
          <ListItemButton
            component={RouterLink}
            to="/projects"
            className={location.pathname === '/projects' ? 'active' : ''}
            sx={{
              borderRadius: 1,
              '&.active': { bgcolor: 'var(--primary-soft)', color: 'var(--primary-soft-text)' },
              '& .MuiListItemText-root': { display: { md: 'none', lg: 'block' } },
              '& .MuiListItemIcon-root': { color: 'inherit' },
              justifyContent: { md: 'center', lg: 'flex-start' },
            }}
          >
            <ListItemIcon sx={{ minWidth: { md: 0, lg: 38 }, justifyContent: 'center' }}><FolderOutlined fontSize="small" /></ListItemIcon>
            <ListItemText primary={t('All projects')} />
          </ListItemButton>
        </List>
        {projectId ? (
          <>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="overline" color="text.secondary" sx={{ px: 2, display: { md: 'none', lg: 'block' } }}>
              {project?.name ?? t('Project')}
            </Typography>
            <ProjectNav projectId={projectId} />
          </>
        ) : null}
      </Box>
      <Box sx={{ flexShrink: 0, pt: 1 }}>
        <Divider sx={{ mb: 1 }} />
        <Box sx={{ display: { xs: 'none', lg: 'block' } }}><ThemeControl /></Box>
        <Stack direction={{ md: 'column', lg: 'row' }} spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'var(--primary-soft)', color: 'var(--primary-soft-text)', fontWeight: 700 }}>
            {user?.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, display: { md: 'none', lg: 'block' } }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{user?.email}</Typography>
          </Box>
        </Stack>
        <Button onClick={logout} color="inherit" startIcon={<LogoutOutlined fontSize="small" />} sx={{
          justifyContent: { md: 'center', lg: 'flex-start' },
          mt: 1,
          px: 1,
          minWidth: { md: 44, lg: 'auto' },
          '& .MuiButton-startIcon': { mr: { md: 0, lg: 1 } },
        }}>
          <Box component="span" sx={{ display: { md: 'none', lg: 'inline' } }}>{t('Log out')}</Box>
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ width: '100%', height: '100dvh', minHeight: 0, display: 'flex', overflow: 'hidden', bgcolor: 'background.default' }}>
      {sidebar}
      <Box sx={{ minWidth: 0, minHeight: 0, height: '100%', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ flexShrink: 0, borderBottom: 1, borderColor: 'divider', zIndex: 10, bgcolor: 'color-mix(in srgb, var(--mui-palette-background-paper) 92%, transparent)', backdropFilter: 'blur(12px)' }}>
          <Toolbar sx={{ gap: 2, justifyContent: 'space-between', flexWrap: 'wrap', py: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h3">{title}</Typography>
              <PageBreadcrumbs projectName={project?.name} projectId={projectId} title={title} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', ml: 'auto' }}>
              <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
                <ProjectSwitcher mobile />
              </Box>
              <Button aria-label="Ask AI" variant="ai" startIcon={<AutoAwesomeOutlined className="ai-sparkle" />} onClick={() => setAssistantOpen(true)}>
                <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>{t('Ask AI')}</Box>
              </Button>
              <ThemeCycleButton />
              <Button variant="contained" onClick={createProject} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>{t('New project')}</Button>
              <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 0.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'var(--primary-soft)', color: 'var(--primary-soft-text)', fontSize: 13 }}>
                  {user?.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                </Avatar>
                <Button onClick={logout} color="inherit">{t('Log out')}</Button>
              </Box>
            </Box>
            {projectId ? (
              <Box sx={{ display: { xs: 'none', md: 'flex' }, width: '100%', gap: 0.5 }}>
                <Box sx={{ display: { md: 'flex', lg: 'none' }, width: '100%' }}><ProjectNav projectId={projectId} /></Box>
              </Box>
            ) : null}
          </Toolbar>
        </AppBar>
        <Box component="main" id="main-content" sx={{ p: { xs: 2, md: 3, lg: 4 }, pb: { xs: 11, md: 3, lg: 4 }, flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehaviorY: 'contain' }}>
          {projectsQuery.isError && !location.pathname.startsWith('/projects') ? (
            <Alert severity="warning" sx={{ mb: 2 }}>{t('Project navigation could not be loaded. Please try again.')}</Alert>
          ) : null}
          <Box key={location.pathname} className="page-enter" sx={{ width: '100%', maxWidth: 1600, mx: 'auto' }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
      <Box component="a" href="#main-content" className="skip-link">{t('Skip to content')}</Box>
      <MobileProjectNavigation projectId={projectId} pathname={location.pathname} />
      <AssistantDrawer key={projectId ?? 'no-project'} open={assistantOpen} onClose={() => setAssistantOpen(false)} projectId={projectId} />
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
  const { t } = useLocale();
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
      <Box sx={{ textAlign: 'center' }}>
        <Box component={RouterLink} to="/projects" aria-label="Kanbot home" sx={{ display: 'inline-flex', mb: 3 }}>
          <Box component="img" className="brand-logo-light" src={kanbotLogo} alt="Kanbot" sx={{ width: 164, height: 'auto' }} />
          <Box component="img" className="brand-logo-dark" src={kanbotLogoDark} alt="Kanbot" sx={{ width: 164, height: 'auto' }} />
        </Box>
        <Box component="svg" viewBox="0 0 220 140" role="img" aria-label="A Todo card that could not be found" sx={{ display: 'block', width: 220, maxWidth: '70vw', mx: 'auto', mb: 2 }}>
          <rect x="35" y="20" width="150" height="100" rx="14" fill="var(--mui-palette-background-paper)" stroke="var(--mui-palette-divider)" strokeWidth="2" />
          <path d="M66 51h88M66 72h56" stroke="var(--mui-palette-neutral-borderStrong)" strokeWidth="7" strokeLinecap="round" />
          <circle cx="153" cy="93" r="13" fill="var(--mui-palette-accent-main)" />
          <path d="m148 88 10 10m0-10-10 10" stroke="var(--mui-palette-accent-ink)" strokeWidth="2" strokeLinecap="round" />
        </Box>
        <Typography component="h1" variant="h1" gutterBottom>{t('Page not found')}</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>{t('The page you are looking for does not exist.')}</Typography>
        <Button component={RouterLink} to="/projects" variant="contained">{t('Go to projects')}</Button>
      </Box>
    </Box>
  );
}

export function ProjectBacklogRedirect() {
  const { projectId } = useParams();
  return <Navigate to={`/projects/${encodeURIComponent(projectId ?? '')}/backlog`} replace />;
}
