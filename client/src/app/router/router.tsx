import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage, RegisterPage } from '../../features/auth/pages/AuthPages';
import { GuestRoute, ProtectedRoute } from '../../features/auth';
import { AppLayout, NotFoundPage, ProjectBacklogRedirect, RoutePlaceholder } from './AppPages';

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
        element: <AppLayout />,
        children: [
          { path: '/', element: <Navigate to="/projects" replace /> },
          { path: '/projects', element: <RoutePlaceholder /> },
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
