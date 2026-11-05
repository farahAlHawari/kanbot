import { Alert, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import type { Sprint, SprintStatus } from '../../../shared/types/api';
import { useSprints } from '../hooks/use-sprints';

const groups: { status: SprintStatus; title: string }[] = [
  { status: 'active', title: 'Active Sprints' },
  { status: 'planned', title: 'Planned Sprints' },
  { status: 'completed', title: 'Completed Sprints' },
];

function sprintPoints(sprint: Sprint) {
  const stats = sprint.status === 'completed' && sprint.completedStats ? sprint.completedStats : sprint.stats;
  return `${stats.donePoints} / ${stats.totalPoints} points completed`;
}

function dateLabel(date: string | null) {
  return date ? new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'Not set';
}

export function SprintHistoryPage() {
  const { projectId = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useSprints(projectId);

  if (isLoading) return <CircularProgress aria-label="Loading Sprint history" />;
  if (isError) {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void refetch()}>Retry</Button>}>
        {error instanceof Error ? error.message : 'Unable to load Sprint history.'}
      </Alert>
    );
  }

  const sprints = data?.sprints ?? [];
  return (
    <Stack spacing={2}>
      <Box>
        <Typography component="h1" variant="h2">Sprint history</Typography>
        <Typography color="text.secondary">Review active, planned, and completed Sprints.</Typography>
      </Box>
      {groups.map(({ status, title }) => {
        const items = sprints.filter((sprint) => sprint.status === status);
        return (
          <Stack key={status} spacing={1}>
            <Typography component="h2" variant="h3">{title}</Typography>
            {items.length ? items.map((sprint) => (
              <Card key={sprint.id} variant="outlined">
                <CardActionArea component={Link} to={`/projects/${projectId}/sprints/${sprint.id}`}>
                  <CardContent>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 700 }}>{sprint.name}</Typography>
                        <Chip size="small" color={status === 'active' ? 'success' : status === 'planned' ? 'primary' : 'default'} label={status} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {dateLabel(sprint.startDate)} – {dateLabel(sprint.endDate)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1 }}>{sprintPoints(sprint)}</Typography>
                    {sprint.goal ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{sprint.goal}</Typography> : null}
                  </CardContent>
                </CardActionArea>
              </Card>
            )) : (
              <Typography color="text.secondary">No {status} Sprints.</Typography>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
