import { Chip } from '@mui/material';
import { useAiStatus } from '../hooks/use-ai-status';
import { useLocale } from '../../../app/providers/use-locale';

export function AiModeBadge({ compact = true }: { compact?: boolean }) {
  const { t } = useLocale();
  const { data } = useAiStatus();
  if (!data) return null;

  const label = data.mode === 'mock'
    ? t('Mock AI')
    : t('AI connected');
  const accessibleLabel = data.mode === 'mock'
    ? t('Mock AI mode')
    : t('AI connected');

  return (
    <Chip
      size="small"
      label={label}
      color={data.mode === 'mock' ? 'default' : 'success'}
      variant="outlined"
      aria-label={accessibleLabel}
      title={accessibleLabel}
      sx={compact
        ? { maxWidth: { xs: 96, sm: 160 }, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }
        : {
          maxWidth: '100%',
          height: 'auto',
          '& .MuiChip-label': { display: 'block', whiteSpace: 'normal', overflowWrap: 'anywhere', py: 0.5 },
        }}
    />
  );
}
