import { createContext } from 'react';
import type { AlertColor } from '@mui/material';

export interface FeedbackContextValue {
  notify: (message: string, severity?: AlertColor) => void;
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);