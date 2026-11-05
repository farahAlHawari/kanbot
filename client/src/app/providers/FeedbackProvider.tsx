import { useCallback, useMemo, useState, type PropsWithChildren } from 'react';
import type { AlertColor } from '@mui/material';
import { Toast } from '../../shared/components/ui';
import { FeedbackContext } from './feedback-context';

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [notice, setNotice] = useState<{ message: string; severity: AlertColor } | null>(null);
  const notify = useCallback((message: string, severity: AlertColor = 'success') => {
    setNotice({ message, severity });
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Toast
        open={notice !== null}
        message={notice?.message ?? ''}
        severity={notice?.severity}
        onClose={() => setNotice(null)}
      />
    </FeedbackContext.Provider>
  );
}