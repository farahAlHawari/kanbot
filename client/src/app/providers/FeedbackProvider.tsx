import { useCallback, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import type { AlertColor } from '@mui/material';
import { Toast } from '../../shared/components/ui';
import { FeedbackContext } from './feedback-context';

interface Notice {
  id: number;
  message: string;
  severity: AlertColor;
}

export function FeedbackProvider({ children }: PropsWithChildren) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const nextId = useRef(0);
  const noticesRef = useRef<Notice[]>([]);
  const notify = useCallback((message: string, severity: AlertColor = 'success') => {
    const notice = { id: ++nextId.current, message, severity };
    const queue = [...noticesRef.current, notice];
    noticesRef.current = queue;
    setNotices(queue);
    if (queue.length === 1) setOpen(true);
  }, []);
  const handleExited = useCallback(() => {
    const queue = noticesRef.current.slice(1);
    noticesRef.current = queue;
    setNotices(queue);
    setOpen(queue.length > 0);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Toast
        key={notices[0]?.id}
        open={open && notices.length > 0}
        message={notices[0]?.message ?? ''}
        severity={notices[0]?.severity}
        onClose={() => setOpen(false)}
        onExited={handleExited}
      />
    </FeedbackContext.Provider>
  );
}