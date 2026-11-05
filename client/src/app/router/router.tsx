import { createBrowserRouter } from 'react-router-dom';
import { FoundationPreviewPage } from '../../shared/components/ui';

export const router = createBrowserRouter([
  { path: '*', element: <FoundationPreviewPage /> },
]);