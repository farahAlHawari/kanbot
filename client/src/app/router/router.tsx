/* eslint-disable react-refresh/only-export-components */
/*
 * router.tsx intentionally mixes non-component exports (the router instance)
 * with lazy component variables and a helper wrapper. Fast-refresh is not
 * required for this file — it is a configuration module, not a UI component.
 */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { GuestRoute, ProtectedRoute } from '../../features/auth';
import { AppShell, NotFoundPage, ProjectBacklogRedirect } from './AppPages';
import { LoadingState } from '../../shared/components/ui';

// Eagerly-loaded auth pages are tiny — keep them in the main chunk so
// first-paint is fast even before any lazy chunk arrives.
import { LoginPage, RegisterPage } from '../../features/auth/pages/AuthPages';

// All project-level pages are lazy-loaded so the initial JS bundle only
// contains the shell, auth, and shared utilities.
const ProjectsPage = lazy(() =>
  import('../../features/projects').then((m) => ({ default: m.ProjectsPage })),
);
const BacklogPage = lazy(() =>
  import('../../features/todos').then((m) => ({ default: m.BacklogPage })),
);
const BoardPage = lazy(() =>
  import('../../features/sprints').then((m) => ({ default: m.BoardPage })),
);
const SprintHistoryPage = lazy(() =>
  import('../../features/sprints').then((m) => ({ default: m.SprintHistoryPage })),
);
const SprintDetailsPage = lazy(() =>
  import('../../features/sprints').then((m) => ({ default: m.SprintDetailsPage })),
);

/** Thin wrapper that shows a skeleton while a lazy page chunk loads. */
function PageSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState label="Loading page" rows={3} />}>{children}</Suspense>;
}

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
          {
            path: '/projects',
            element: <PageSuspense><ProjectsPage /></PageSuspense>,
          },
          {
            path: '/projects/:projectId',
            element: <ProjectBacklogRedirect />,
          },
          {
            path: '/projects/:projectId/backlog',
            element: <PageSuspense><BacklogPage /></PageSuspense>,
          },
          {
            path: '/projects/:projectId/board',
            element: <PageSuspense><BoardPage /></PageSuspense>,
          },
          {
            path: '/projects/:projectId/sprints',
            element: <PageSuspense><SprintHistoryPage /></PageSuspense>,
          },
          {
            path: '/projects/:projectId/sprints/:sprintId',
            element: <PageSuspense><SprintDetailsPage /></PageSuspense>,
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
