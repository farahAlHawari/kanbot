import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage, RegisterPage } from '../../features/auth/pages/AuthPages';
import { ProjectsPage } from '../../features/projects';
import { BacklogPage } from '../../features/todos';
import { BoardPage, SprintDetailsPage, SprintHistoryPage } from '../../features/sprints';
import { GuestRoute, ProtectedRoute } from '../../features/auth';
import { AppShell, NotFoundPage, ProjectBacklogRedirect } from './AppPages';

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
          { path: '/projects/:projectId/backlog', element: <BacklogPage /> },
          { path: '/projects/:projectId/board', element: <BoardPage /> },
          { path: '/projects/:projectId/sprints', element: <SprintHistoryPage /> },
          { path: '/projects/:projectId/sprints/:sprintId', element: <SprintDetailsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
