import { Box, Button, Card, CardActionArea, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Sprint, SprintStatus } from '../../../shared/types/api';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/ui';
import { useLocale } from '../../../app/providers/use-locale';
import { useSprints } from '../hooks/use-sprints';

const groups: { status: SprintStatus; title: string }[] = [
  { status: 'active', title: 'Active Sprints' },
  { status: 'planned', title: 'Planned Sprints' },
  { status: 'completed', title: 'Completed Sprints' },
];

function sprintPoints(sprint: Sprint, t: (text: string) => string) {
  const stats = sprint.status === 'completed' && sprint.completedStats ? sprint.completedStats : sprint.stats;
  return `${stats.donePoints} / ${stats.totalPoints} ${t('points completed')}`;
}

function dateLabel(date: string | null) {
  return date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString('en', { timeZone: 'UTC' })
    : 'Not set';
}

export function SprintHistoryPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useLocale();
  const { data, isLoading, isError, error, refetch } = useSprints(projectId);

  if (isLoading) return <LoadingState label="Loading Sprint history" rows={3} />;
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'Unable to load Sprint history.'} onRetry={() => void refetch()} />;

  const sprints = data?.sprints ?? [];
  return (
    <Stack spacing={2}>
      <Box>
        <Typography component="h1" variant="h2">{t('Sprint history')}</Typography>
        <Typography color="text.secondary">{t('Review active, planned, and completed Sprints.')}</Typography>
      </Box>
      {sprints.length === 0 ? (
        <Card variant="outlined">
          <EmptyState
            title="No Sprints yet"
            description="Create a Sprint to start planning."
            action={<Button variant="contained" onClick={() => navigate(`/projects/${projectId}/backlog`)}>{t('Create Sprint')}</Button>}
          />
        </Card>
      ) : groups.map(({ status, title }) => {
        const items = sprints.filter((sprint) => sprint.status === status);
        if (!items.length) return null;
        return (
          <Stack key={status} spacing={1}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography component="h2" variant="h3">{t(title)}</Typography>
              <Chip size="small" label={items.length} />
            </Stack>
            {items.map((sprint) => (
              <Card key={sprint.id} variant="outlined">
                <CardActionArea component={Link} to={`/projects/${projectId}/sprints/${sprint.id}`}>
                  <CardContent>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 700 }}>{sprint.name}</Typography>
                        <Chip size="small" color={status === 'active' ? 'success' : status === 'planned' ? 'primary' : 'default'} label={t(status)} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {dateLabel(sprint.startDate)} – {dateLabel(sprint.endDate)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1 }}>{sprintPoints(sprint, t)}</Typography>
                    {sprint.goal ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{sprint.goal}</Typography> : null}
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
        );
      })}
    </Stack>
  );
}
