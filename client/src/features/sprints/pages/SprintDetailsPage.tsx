import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, CardContent, Chip, CircularProgress, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { getSprint } from '../api/sprints-api';
import { listTodos } from '../../todos/api/todos-api';
import type { SprintStats, Todo } from '../../../shared/types/api';
import { SprintSummaryPanel } from '../../ai-assistant/components/SprintSummaryPanel';

function dateLabel(date: string | null) {
  return date ? new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'Not set';
}

function TodoItem({ todo }: { todo: Todo }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{todo.key}</Typography>
      <Typography sx={{ fontWeight: 600 }}>{todo.title}</Typography>
      <Stack direction="row" spacing={0.75} sx={{ mt: 0.75 }}>
        <Chip size="small" variant="outlined" label={todo.type} />
        <Chip size="small" label={todo.priority} />
        {todo.storyPoints !== null ? <Chip size="small" variant="outlined" label={`${todo.storyPoints} pts`} /> : null}
      </Stack>
    </Paper>
  );
}

export function SprintDetailsPage() {
  const { projectId = '', sprintId = '' } = useParams();
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

  if (sprintQuery.isLoading) return <CircularProgress aria-label="Loading Sprint details" />;
  if (sprintQuery.isError || !sprintQuery.data?.sprint) {
    return (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void sprintQuery.refetch()}>Retry</Button>}>
        {sprintQuery.error instanceof Error ? sprintQuery.error.message : 'Unable to load Sprint details.'}
      </Alert>
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
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1 }}>
        <Stack>
          <Typography component="h1" variant="h2">{sprint.name}</Typography>
          <Typography color="text.secondary">{sprint.goal || 'No goal set.'}</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Chip color={sprint.status === 'active' ? 'success' : sprint.status === 'planned' ? 'primary' : 'default'} label={sprint.status} />
          <Button component={Link} to={`/projects/${projectId}/sprints`}>Sprint history</Button>
        </Stack>
      </Stack>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography>Dates: {dateLabel(sprint.startDate)} – {dateLabel(sprint.endDate)}</Typography>
            <Typography>Total Todos: {stats.totalTodos}</Typography>
            <Typography>Completed Todos: {stats.doneTodos}</Typography>
            <Typography>Completed story points: {stats.donePoints} / {stats.totalPoints}</Typography>
            {sprint.status === 'completed' ? <Typography>Carried-over Todos: {carriedOver}</Typography> : null}
            <Typography>Completion: {percentage}%</Typography>
            <LinearProgress variant="determinate" value={percentage} aria-label="Sprint completion" />
          </Stack>
        </CardContent>
      </Card>

      {sprint.status !== 'planned' ? <SprintSummaryPanel sprint={sprint} projectId={projectId} /> : null}

      <Stack spacing={1}>
        <Typography component="h2" variant="h3">{sprint.status === 'completed' ? 'Completed Todos' : 'Todos'}</Typography>
        {todosQuery.isLoading ? <CircularProgress aria-label="Loading Sprint Todos" /> : null}
        {todosQuery.isError ? (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void todosQuery.refetch()}>Retry</Button>}>
            {todosQuery.error instanceof Error ? todosQuery.error.message : 'Unable to load Sprint Todos.'}
          </Alert>
        ) : null}
        {!todosQuery.isLoading && !todosQuery.isError && displayedTodos.length ? (
          displayedTodos.map((todo) => <TodoItem key={todo.id} todo={todo} />)
        ) : null}
        {!todosQuery.isLoading && !todosQuery.isError && !displayedTodos.length ? (
          <Typography color="text.secondary">No Todos in this Sprint.</Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
