import { Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import { SprintSections } from '../components/SprintSections';

export function SprintsPage() {
  const { projectId = '' } = useParams();
  return (
    <Stack spacing={2}>
      <Typography component="h1" variant="h2">Sprint planning</Typography>
      <SprintSections projectId={projectId} />
    </Stack>
  );
}
