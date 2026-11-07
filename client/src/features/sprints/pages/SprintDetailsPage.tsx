import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Breadcrumbs, Button, Card, CardContent, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../../shared/api/errors';
import { getSprint } from '../api/sprints-api';
import { listTodos } from '../../todos/api/todos-api';
import type { SprintStats, Todo } from '../../../shared/types/api';
import { SprintSummaryPanel } from '../../ai-assistant/components/SprintSummaryPanel';
import { EmptyState, ErrorState, LoadingState, PriorityBadge, TaskTypeBadge, TodoStatusBadge } from '../../../shared/components/ui';
import { todoTypeAccentSx } from '../../../shared/components/todo-visuals';
import { useLocale } from '../../../app/providers/use-locale';

function dateLabel(date: string | null) {
  return date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString('en', { timeZone: 'UTC' })
    : 'Not set';
}

function TodoItem({ todo }: { todo: Todo }) {
  const { t } = useLocale();
  return (
    <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1.5, '&:hover': { borderColor: 'primary.light' }, ...todoTypeAccentSx(todo.type) }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', flexWrap: 'wrap', mb: 0.25 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace', letterSpacing: '0.02em', flexShrink: 0 }}
          >
            {todo.key}
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', overflowWrap: 'anywhere', lineHeight: 1.45 }}>{todo.title}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: 'wrap' }}>
          <TaskTypeBadge type={todo.type} />
          <TodoStatusBadge status={todo.status} />
          <PriorityBadge priority={todo.priority} />
          {todo.storyPoints !== null ? <Chip size="small" variant="outlined" label={`${todo.storyPoints} ${t('points')}`} /> : null}
        </Stack>
      </Box>
    </Paper>
  );
}

export function SprintDetailsPage() {
  const { projectId = '', sprintId = '' } = useParams();
  const { t } = useLocale();
  const sprintQuery = useQuery({
    queryKey: ['sprint', sprintId],
    queryFn: () => getSprint(sprintId),
    enabled: Boolean(sprintId),
  });
  const todosQuery = useQuery({
    queryKey: ['sprint-todos', sprintId],
    queryFn: () => listTodos(projectId, { sprintId }),
    enabled: Boolean(projectId && sprintId && sprintQuery.data),
  });

  if (sprintQuery.isLoading) return <LoadingState label="Loading Sprint details" rows={3} />;
  if (sprintQuery.isError || !sprintQuery.data?.sprint) {
    const unavailable = sprintQuery.error instanceof ApiError && (sprintQuery.error.status === 403 || sprintQuery.error.status === 404);
    return (
      <ErrorState
        message={sprintQuery.error instanceof Error ? sprintQuery.error.message : 'Unable to load Sprint details.'}
        {...(unavailable
          ? { action: <Button component={Link} to="/projects">{t('Go to projects')}</Button> }
          : { onRetry: () => void sprintQuery.refetch() })}
      />
    );
  }

  const sprint = sprintQuery.data.sprint;
  const historicalStats = sprint.status === 'completed' ? sprint.completedStats : null;
  const stats: SprintStats = historicalStats ?? sprint.stats;
  const carriedOver = historicalStats?.carriedOver ?? 0;
  const percentage = stats.totalTodos ? Math.round((stats.doneTodos / stats.totalTodos) * 100) : 0;
  const todos = todosQuery.data?.todos ?? [];
  const displayedTodos = sprint.status === 'completed' ? todos.filter((todo) => todo.status === 'done') : todos;

  return (
    <Stack spacing={2}>
      {/* Breadcrumb: Projects > Sprint history > Sprint name */}
      <Breadcrumbs aria-label="Breadcrumbs">
        <Typography
          component={Link}
          to="/projects"
          variant="body2"
          color="text.secondary"
          sx={{ textDecoration: 'none' }}
        >
          {t('Projects')}
        </Typography>
        <Typography
          component={Link}
          to={`/projects/${projectId}/sprints`}
          variant="body2"
          color="text.secondary"
          sx={{ textDecoration: 'none' }}
        >
          {t('Sprint history')}
        </Typography>
        <Typography variant="body2" color="text.primary">{sprint.name}</Typography>
      </Breadcrumbs>

      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1 }}>
        <Stack>
          <Typography component="h1" variant="h2">{sprint.name}</Typography>
          <Typography color="text.secondary">{sprint.goal || t('No goal set.')}</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Chip color={sprint.status === 'active' ? 'success' : sprint.status === 'planned' ? 'primary' : 'default'} label={sprint.status} />
        </Stack>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
              {[
                { label: t('Dates'), value: `${dateLabel(sprint.startDate)} – ${dateLabel(sprint.endDate)}` },
                { label: t('Total Todos'), value: stats.totalTodos },
                { label: t('Completed Todos'), value: stats.doneTodos },
                { label: t('Completed story points'), value: `${stats.donePoints} / ${stats.totalPoints}` },
                ...(sprint.status === 'completed' ? [{ label: t('Carried-over Todos'), value: carriedOver }] : []),
                { label: t('Completion'), value: `${percentage}%` },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ minWidth: 0, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.subtle' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{value}</Typography>
                </Box>
              ))}
            </Box>
            <LinearProgress variant="determinate" value={percentage} aria-label={t('Sprint completion')} />
          </Stack>
        </CardContent>
      </Card>

      {sprint.status !== 'planned' ? <SprintSummaryPanel sprint={sprint} projectId={projectId} /> : null}

      <Stack spacing={1}>
        <Typography component="h2" variant="h3">{sprint.status === 'completed' ? t('Completed Todos') : t('Todos')}</Typography>
        {todosQuery.isLoading ? <LoadingState label="Loading Sprint Todos" rows={2} /> : null}
        {todosQuery.isError ? (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void todosQuery.refetch()}>{t('Retry')}</Button>}>
            {todosQuery.error instanceof Error ? todosQuery.error.message : 'Unable to load Sprint Todos.'}
          </Alert>
        ) : null}
        {!todosQuery.isLoading && !todosQuery.isError && displayedTodos.length ? (
          displayedTodos.map((todo) => <TodoItem key={todo.id} todo={todo} />)
        ) : null}
        {!todosQuery.isLoading && !todosQuery.isError && !displayedTodos.length ? (
          <Paper variant="outlined"><EmptyState title="No Todos in this Sprint." /></Paper>
        ) : null}
      </Stack>
    </Stack>
  );
}
