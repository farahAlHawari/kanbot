import { Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { SprintSections } from '../components/SprintSections';
import { useLocale } from '../../../app/providers/use-locale';

export function SprintsPage() {
  const { projectId = '' } = useParams();
  const { t } = useLocale();
  return (
    <Stack spacing={2}>
      <Typography component="h1" variant="h2">{t('Sprint planning')}</Typography>
      <SprintSections projectId={projectId} />
    </Stack>
  );
}
