import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage, RegisterPage } from '../../features/auth/pages/AuthPages';
import { ProjectsPage } from '../../features/projects';
import { GuestRoute, ProtectedRoute } from '../../features/auth';
import { AppShell, NotFoundPage, ProjectBacklogRedirect, RoutePlaceholder } from './AppPages';

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Navigate to="/projects" replace /> },
          { path: '/projects', element: <ProjectsPage /> },
          { path: '/projects/:projectId', element: <ProjectBacklogRedirect /> },
          { path: '/projects/:projectId/backlog', element: <RoutePlaceholder /> },
          { path: '/projects/:projectId/board', element: <RoutePlaceholder /> },
          { path: '/projects/:projectId/sprints', element: <RoutePlaceholder /> },
          { path: '/projects/:projectId/sprints/:sprintId', element: <RoutePlaceholder /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
