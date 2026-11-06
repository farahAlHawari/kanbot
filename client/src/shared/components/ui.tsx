import { useId, useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button as MuiButton,
  Card as MuiCard,
  CardContent,
  Chip,
  CircularProgress,
  Dialog as MuiDialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Skeleton as MuiSkeleton,
  Snackbar,
  TextField,
  Typography,
  type AlertColor,
  type ButtonProps,
  type TextFieldProps,
} from '@mui/material';
import kanbotLogo from '../../assets/kanbot-logo.svg';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import { useLocale } from '../../app/providers/use-locale';

export function Button(props: ButtonProps) {
  return <MuiButton {...props} />;
}

type FieldProps = Omit<TextFieldProps, 'variant'>;

export function Input(props: FieldProps) {
  return <TextField variant="outlined" {...props} />;
}

export function Textarea(props: Omit<FieldProps, 'multiline'>) {
  return <TextField variant="outlined" multiline minRows={3} {...props} />;
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function Select({ label, value, options, onChange, disabled }: SelectProps) {
  return (
    <TextField
      select
      fullWidth
      label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(String(event.target.value))}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export function Badge({ label, color = 'default' }: { label: string; color?: 'default' | 'primary' | 'success' | 'warning' | 'error' }) {
  return <Chip size="small" label={label} color={color} />;
}

export function Card({ children, title }: PropsWithChildren<{ title?: string }>) {
  return (
    <MuiCard variant="outlined" sx={{ borderColor: 'divider', boxShadow: 'none' }}>
      {title ? <CardContent sx={{ pb: 0 }}><Typography variant="h3">{title}</Typography></CardContent> : null}
      <CardContent>{children}</CardContent>
    </MuiCard>
  );
}

interface DialogProps extends PropsWithChildren {
  open: boolean;
  title: string;
  onClose: () => void;
  actions?: ReactNode;
}

export function Dialog({ open, title, onClose, actions, children }: DialogProps) {
  const titleId = useId();
  return (
    <MuiDialog open={open} onClose={onClose} aria-labelledby={titleId} fullWidth maxWidth="sm">
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      {actions ? <DialogActions>{actions}</DialogActions> : null}
    </MuiDialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      actions={
        <>
          <MuiButton onClick={onCancel}>Cancel</MuiButton>
          <MuiButton color="error" variant="contained" onClick={onConfirm}>{confirmLabel}</MuiButton>
        </>
      }
    >
      <Typography>{message}</Typography>
    </Dialog>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <CircularProgress size={24} aria-label={label} />;
}

export function Skeleton({ width = '100%', height = 20 }: { width?: number | string; height?: number }) {
  return <MuiSkeleton variant="rounded" width={width} height={height} />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  const { t } = useLocale();
  return (
    <Box sx={{ textAlign: 'center', py: { xs: 3, sm: 4 }, px: 2, maxWidth: 520, mx: 'auto' }}>
      <Box sx={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: 'action.hover', color: 'text.secondary', mx: 'auto', mb: 1.5 }}>
        <InboxOutlined />
      </Box>
      <Typography variant="h3" gutterBottom>{t(title)}</Typography>
      {description ? <Typography color="text.secondary" sx={{ mb: 2, maxWidth: 420, mx: 'auto' }}>{t(description)}</Typography> : null}
      {action}
    </Box>
  );
}

export function LoadingState({ label = 'Loading', rows = 3 }: { label?: string; rows?: number }) {
  const { t } = useLocale();
  return (
    <Box role="status" aria-label={t(label)} aria-busy="true" sx={{ width: '100%', py: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{t(label)}</Typography>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {Array.from({ length: rows }, (_, index) => (
          <MuiSkeleton key={index} variant="rounded" height={index === 0 ? 72 : 56} />
        ))}
      </Box>
    </Box>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLocale();
  return (
    <MuiCard variant="outlined" sx={{ borderColor: 'error.light' }}>
      <CardContent sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Alert severity="error" role="alert" sx={{ flex: 1, minWidth: 220, p: 0, bgcolor: 'transparent' }}>{t(message)}</Alert>
        {onRetry ? <MuiButton color="error" variant="outlined" size="small" onClick={onRetry}>{t('Retry')}</MuiButton> : null}
      </CardContent>
    </MuiCard>
  );
}

export function Toast({ open, message, severity = 'success', onClose }: {
  open: boolean;
  message: string;
  severity?: AlertColor;
  onClose: () => void;
}) {
  return (
    <Snackbar open={open} autoHideDuration={5000} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <Alert onClose={onClose} severity={severity} variant="filled" role="status">{message}</Alert>
    </Snackbar>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
      <Box>
        <Typography component="h1" variant="h1">{title}</Typography>
        {description ? <Typography color="text.secondary" sx={{ mt: 0.5 }}>{description}</Typography> : null}
      </Box>
      {action}
    </Box>
  );
}

export function FoundationPreviewPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  return (
    <Box className="foundation-page">
      <PageHeader title="Kanbot" description="Application foundation" action={<Badge label="Ready to build" color="primary" />} />
      <Box component="img" src={kanbotLogo} alt="Kanbot" sx={{ width: 144, height: 'auto', mb: 3 }} />
      <Card title="Shared interface components">
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="contained" onClick={() => setDialogOpen(true)}>Open dialog</Button>
            <Button variant="outlined" onClick={() => setConfirmOpen(true)}>Confirm action</Button>
            <Button onClick={() => setToastOpen(true)}>Show feedback</Button>
            <Badge label="Primary" color="primary" />
          </Box>
          <Input label="Text field" placeholder="Enter text" />
          <Textarea label="Multiline field" placeholder="Enter details" />
          <Select label="Select field" value="task" onChange={() => undefined} options={[{ value: 'task', label: 'Task' }, { value: 'bug', label: 'Bug' }]} />
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}><Spinner /><Skeleton width={180} /></Box>
          <EmptyState title="Empty state preview" description="This component is ready for data-driven pages." />
          <ErrorState message="Error state preview" onRetry={() => undefined} />
        </Box>
      </Card>
      <Dialog open={dialogOpen} title="Dialog preview" onClose={() => setDialogOpen(false)} actions={<Button onClick={() => setDialogOpen(false)}>Close</Button>}>
        <Typography>Dialogs support keyboard focus and Escape to close.</Typography>
      </Dialog>
      <ConfirmDialog open={confirmOpen} title="Confirm action" message="This reusable dialog requires an explicit confirmation." onCancel={() => setConfirmOpen(false)} onConfirm={() => setConfirmOpen(false)} />
      <Toast open={toastOpen} message="Feedback preview" onClose={() => setToastOpen(false)} />
    </Box>
  );
}