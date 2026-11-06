import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import DragIndicatorOutlined from '@mui/icons-material/DragIndicatorOutlined';
import { useFeedback } from '../../../app/providers/use-feedback';
import { ApiError } from '../../../shared/api/errors';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/ui';
import { useLocale } from '../../../app/providers/use-locale';
import { TODO_STATUSES, type Sprint, type SprintBoardResponse, type Todo, type TodoStatus } from '../../../shared/types/api';
import { SprintSummaryPanel } from '../../ai-assistant/components/SprintSummaryPanel';
import { listSprints, completeSprint } from '../api/sprints-api';
import { summarizeSprint } from '../../ai-assistant/api/ai-api';
import { getSprintBoard } from '../api/sprints-api';
import { moveTodo } from '../../todos/api/todos-api';
import { TodoDetailsDialog } from '../../todos/components/TodoDetailsDialog';
import { todosQueryKey } from '../../todos/hooks/use-backlog';
import { sprintsQueryKey } from '../hooks/use-sprints';

const columnLabels: Record<TodoStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const typeLabels: Record<Todo['type'], string> = { task: 'Task', story: 'Story', bug: 'Bug' };
const priorityLabels: Record<Todo['priority'], string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
function dateOnly(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function dateLabel(date: string | null) {
  return date
    ? new Date(`${date}T00:00:00Z`).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : 'Not set';
}

function remainingDays(endDate: string | null) {
  if (!endDate) return null;
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const today = Date.parse(`${dateOnly(new Date())}T00:00:00Z`);
  return Math.ceil((end - today) / 86_400_000);
}

function updateBoardStats(board: SprintBoardResponse): SprintBoardResponse {
  const todos = TODO_STATUSES.flatMap((status) => board.columns[status]);
  const done = board.columns.done;
  return {
    ...board,
    sprint: {
      ...board.sprint,
      stats: {
        ...board.sprint.stats,
        totalTodos: todos.length,
        doneTodos: done.length,
        totalPoints: todos.reduce((sum, todo) => sum + (todo.storyPoints ?? 0), 0),
        donePoints: done.reduce((sum, todo) => sum + (todo.storyPoints ?? 0), 0),
        byStatus: Object.fromEntries(TODO_STATUSES.map((status) => [status, board.columns[status].length])) as Sprint['stats']['byStatus'],
      },
    },
  };
}

function SortableTodoCard({ todo, onOpen, onStatusChange }: {
  todo: Todo;
  onOpen: () => void;
  onStatusChange: (status: TodoStatus) => void;
}) {
  const { t } = useLocale();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    data: { status: todo.status },
  });
  return (
    <Card
      ref={setNodeRef}
      variant="outlined"
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'space-between', minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{todo.key}</Typography>
            <IconButton
              size="small"
              aria-label={`${t('Reorder')} ${todo.key}`}
              {...attributes}
              {...listeners}
              onClick={(event) => event.stopPropagation()}
              sx={{ flexShrink: 0, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
            >
              <DragIndicatorOutlined fontSize="small" />
            </IconButton>
          </Stack>
          <Button
            onClick={onOpen}
            fullWidth
            sx={{ minWidth: 0, justifyContent: 'flex-start', p: 0, textAlign: 'left', whiteSpace: 'normal', textTransform: 'none', color: 'text.primary' }}
          >
            <Typography sx={{ width: '100%', fontWeight: 600, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{todo.title}</Typography>
          </Button>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
            <Chip size="small" variant="outlined" label={t(typeLabels[todo.type])} />
            <Chip size="small" label={t(priorityLabels[todo.priority])} />
            {todo.storyPoints !== null ? <Chip size="small" variant="outlined" label={`${todo.storyPoints} pts`} /> : null}
          </Stack>
          <FormControl size="small" fullWidth>
            <InputLabel id={`status-${todo.id}`}>{t('Status')}</InputLabel>
            <Select
              labelId={`status-${todo.id}`}
              label={t('Status')}
              value={todo.status}
              onChange={(event) => onStatusChange(event.target.value as TodoStatus)}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {TODO_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>{t(columnLabels[status])}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </CardContent>
    </Card>
  );
}

function BoardColumn({
  status,
  todos,
  onOpen,
  onStatusChange,
}: {
  status: TodoStatus;
  todos: Todo[];
  onOpen: (todo: Todo) => void;
  onStatusChange: (todo: Todo, status: TodoStatus) => void;
}) {
  const { t } = useLocale();
  const { setNodeRef, isOver } = useDroppable({ id: `column-${status}`, data: { status } });
  return (
    <Paper
      ref={setNodeRef}
      variant="outlined"
      sx={{
        p: 1.5,
        height: 'clamp(280px, calc(100dvh - 460px), 560px)',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: isOver ? 'action.hover' : 'background.subtle',
        scrollSnapAlign: 'start',
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography component="h2" variant="h3">{t(columnLabels[status])}</Typography>
        <Chip size="small" label={todos.length} aria-label={`${t(columnLabels[status])} ${t('count')}`} />
      </Stack>
      <SortableContext items={todos.map((todo) => todo.id)} strategy={verticalListSortingStrategy}>
        <Stack spacing={1} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain', pr: 0.5 }}>
          {todos.map((todo) => (
            <SortableTodoCard
              key={todo.id}
              todo={todo}
              onOpen={() => onOpen(todo)}
              onStatusChange={(nextStatus) => onStatusChange(todo, nextStatus)}
            />
          ))}
          {!todos.length ? <Typography variant="body2" color="text.secondary">{t('No Todos')}</Typography> : null}
        </Stack>
      </SortableContext>
    </Paper>
  );
}

function CompleteSprintDialog({
  sprint,
  plannedSprints,
  todos,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  sprint: Sprint;
  plannedSprints: Sprint[];
  todos: Todo[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (destination: string, generateSummary: boolean) => Promise<void>;
}) {
  const { t } = useLocale();
  const [destination, setDestination] = useState('backlog');
  const [generateSummary, setGenerateSummary] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const completed = todos.filter((todo) => todo.status === 'done').length;
  const unfinished = todos.length - completed;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (destination !== 'backlog' && !plannedSprints.some((sprintOption) => sprintOption.id === destination)) {
      setFieldError(t('Choose the backlog or a planned Sprint.'));
      return;
    }
    setFieldError('');
    void onSubmit(destination, generateSummary);
  }

  return (
    <Dialog open onClose={pending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="complete-sprint-title">
      <DialogTitle id="complete-sprint-title">{t('Complete')} {sprint.name}?</DialogTitle>
      <form onSubmit={submit} noValidate aria-busy={pending}>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
            <Typography>
              {completed} {t('completed')} {t('Todos')} · {unfinished} {t('unfinished')} {t('Todos')}
            </Typography>
            <FormControl fullWidth error={Boolean(fieldError)}>
              <InputLabel id="unfinished-destination-label">{t('Move unfinished Todos to')}</InputLabel>
              <Select
                labelId="unfinished-destination-label"
                label={t('Move unfinished Todos to')}
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
              >
                <MenuItem value="backlog">{t('Backlog')}</MenuItem>
                {plannedSprints.map((planned) => (
                  <MenuItem key={planned.id} value={planned.id}>{planned.name}</MenuItem>
                ))}
              </Select>
              {fieldError ? <Typography variant="caption" color="error">{fieldError}</Typography> : null}
            </FormControl>
            <FormControlLabel
              control={<Checkbox checked={generateSummary} onChange={(event) => setGenerateSummary(event.target.checked)} />}
              label={t('Generate AI summary')}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={pending}>{t('Cancel')}</Button>
          <Button type="submit" color="primary" variant="contained" disabled={pending}>
            {pending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
            {t('Complete Sprint')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function BoardPage() {
  const { projectId = '' } = useParams();
  const { t } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const sprintsQuery = useQuery({
    queryKey: sprintsQueryKey(projectId),
    queryFn: () => listSprints(projectId),
    enabled: projectId.length > 0,
  });
  const activeSprint = sprintsQuery.data?.sprints.find((sprint) => sprint.status === 'active');
  const boardQuery = useQuery({
    queryKey: ['sprint-board', activeSprint?.id],
    queryFn: () => getSprintBoard(activeSprint!.id),
    enabled: Boolean(activeSprint),
  });
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [dragAnnouncement, setDragAnnouncement] = useState('');
  const board = boardQuery.data;
  const todos = board ? TODO_STATUSES.flatMap((status) => board.columns[status]) : [];
  const plannedSprints = sprintsQuery.data?.sprints.filter((sprint) => sprint.status === 'planned') ?? [];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const collisionDetection = (args: Parameters<typeof pointerWithin>[0]) => {
    const droppableContainers = args.droppableContainers.filter((container) => container.id !== args.active.id);
    const pointerCollisions = pointerWithin({ ...args, droppableContainers });
    return pointerCollisions.length
      ? pointerCollisions
      : closestCenter({ ...args, droppableContainers });
  };

  const moveMutation = useMutation({
    mutationFn: ({ todoId, status, position }: { todoId: string; status: TodoStatus; position: number }) =>
      moveTodo(todoId, { status, position }),
    onMutate: async ({ todoId, status, position }) => {
      const queryKey = ['sprint-board', activeSprint?.id] as const;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<SprintBoardResponse>(queryKey);
      if (previous) {
        const columns = { ...previous.columns };
        const sourceStatus = TODO_STATUSES.find((candidate) => columns[candidate].some((todo) => todo.id === todoId));
        if (sourceStatus) {
          const sourceTodos = [...columns[sourceStatus]];
          const fromIndex = sourceTodos.findIndex((todo) => todo.id === todoId);
          const [moving] = sourceTodos.splice(fromIndex, 1);
          const targetTodos = sourceStatus === status ? sourceTodos : [...columns[status]];
          const targetIndex = Math.max(0, Math.min(position, targetTodos.length));
          targetTodos.splice(targetIndex, 0, { ...moving, status });
          columns[sourceStatus] = sourceTodos.map((todo, index) => ({ ...todo, order: index }));
          columns[status] = targetTodos.map((todo, index) => ({ ...todo, order: index }));
          queryClient.setQueryData(queryKey, updateBoardStats({ ...previous, columns }));
        }
      }
      return { previous };
    },
    onError: (failure: unknown, _variables, context) => {
      if (context?.previous && activeSprint) {
        queryClient.setQueryData(['sprint-board', activeSprint.id], context.previous);
      }
      notify(failure instanceof Error ? `Todo move failed: ${failure.message}` : 'Todo move failed. The previous board was restored.', 'error');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sprintsQueryKey(projectId) });
      await queryClient.invalidateQueries({ queryKey: todosQueryKey(projectId) });
    },
    onSettled: async () => {
      if (activeSprint) {
        await queryClient.invalidateQueries({ queryKey: ['sprint-board', activeSprint.id] });
      }
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({
      destination,
      generateSummary,
    }: {
      destination: string;
      generateSummary: boolean;
    }) => {
      if (!activeSprint) throw new Error('There is no active Sprint to complete.');
      const completion = await completeSprint(activeSprint.id, { moveUnfinishedTo: destination });
      let summaryError: string | null = null;
      if (generateSummary) {
        try {
          await summarizeSprint(activeSprint.id);
        } catch (failure) {
          summaryError = failure instanceof ApiError && failure.status === 429
            ? 'Too many requests. Please wait a moment.'
            : failure instanceof Error ? failure.message : 'The Sprint completed, but its AI summary could not be generated.';
        }
      }
      return { completion, summaryError };
    },
    onSuccess: async ({ completion, summaryError }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sprintsQueryKey(projectId) }),
        queryClient.invalidateQueries({ queryKey: todosQueryKey(projectId) }),
        queryClient.invalidateQueries({ queryKey: ['sprint-board', completion.sprint.id] }),
        queryClient.invalidateQueries({ queryKey: ['sprint', completion.sprint.id] }),
      ]);
      notify(`${completion.sprint.name} completed.`);
      if (summaryError) notify(`Sprint completed, but summary generation failed: ${summaryError}`, 'error');
      setCompleteOpen(false);
      navigate(`/projects/${projectId}/sprints/${completion.sprint.id}`);
    },
  });

  function onDragEnd(event: DragEndEvent) {
    if (!board || !event.over || event.active.id === event.over.id || moveMutation.isPending) return;
    const activeId = String(event.active.id);
    const overId = String(event.over.id);
    const sourceStatus = TODO_STATUSES.find((status) => board.columns[status].some((todo) => todo.id === activeId));
    const targetStatus = (TODO_STATUSES.find((status) => status === event.over?.data.current?.status)
      ?? TODO_STATUSES.find((status) => status === overId.replace('column-', '')));
    if (!sourceStatus || !targetStatus) return;
    const targetList = board.columns[targetStatus];
    const overIndex = targetList.findIndex((todo) => todo.id === overId);
    const position = overIndex === -1
      ? (sourceStatus === targetStatus ? targetList.findIndex((todo) => todo.id === activeId) : targetList.length)
      : overIndex;
    if (sourceStatus === targetStatus && position < 0) return;
    moveMutation.mutate({ todoId: activeId, status: targetStatus, position });
  }

  function changeStatus(todo: Todo, status: TodoStatus) {
    if (status === todo.status || moveMutation.isPending || !board) return;
    moveMutation.mutate({ todoId: todo.id, status, position: board.columns[status].length });
  }

  if (sprintsQuery.isLoading) return <LoadingState label="Loading active Sprint" rows={2} />;
  if (sprintsQuery.isError) {
    return <ErrorState message={sprintsQuery.error instanceof Error ? sprintsQuery.error.message : 'Unable to load Sprints.'} onRetry={() => void sprintsQuery.refetch()} />;
  }
  if (!activeSprint) {
    return (
      <Paper variant="outlined">
        <EmptyState
          title="No active Sprint"
          description="Start a planned Sprint from your backlog to see its board here."
          action={<Button component={Link} to={`/projects/${projectId}/backlog`} variant="contained">{t('Go to Backlog')}</Button>}
        />
      </Paper>
    );
  }
  if (boardQuery.isLoading) return <LoadingState label="Loading Sprint board" rows={4} />;
  if (boardQuery.isError || !board) {
    return <ErrorState message={boardQuery.error instanceof Error ? boardQuery.error.message : 'Unable to load the Sprint board.'} onRetry={() => void boardQuery.refetch()} />;
  }

  const sprint = board.sprint;
  const stats = sprint.stats;
  const days = remainingDays(sprint.endDate);
  const completionPercent = stats.totalTodos ? Math.round((stats.doneTodos / stats.totalTodos) * 100) : 0;
  const pointsPercent = stats.totalPoints ? Math.round((stats.donePoints / stats.totalPoints) * 100) : 0;
  const remainingLabel = days === null
    ? `${t('Remaining days')}: ${t('Not set')}`
    : days < 0
      ? `${Math.abs(days)} ${t('days overdue')}`
      : `${days} ${t('days remaining')}`;

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1 }}>
        <Box>
          <Typography component="h1" variant="h2">{sprint.name}</Typography>
          {sprint.goal ? <Typography color="text.secondary">{sprint.goal}</Typography> : null}
        </Box>
        <Button
          variant="contained"
          color="success"
          onClick={() => {
            completeMutation.reset();
            setCompleteOpen(true);
          }}
        >
          {t('Complete Sprint')}
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Typography>{t('Start')}: {dateLabel(sprint.startDate)}</Typography>
            <Typography>{t('End')}: {dateLabel(sprint.endDate)}</Typography>
            <Typography>{remainingLabel}</Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="body2">{stats.doneTodos} / {stats.totalTodos} Todos completed ({completionPercent}%)</Typography>
            <LinearProgress variant="determinate" value={completionPercent} aria-label={t('Todo completion')} />
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="body2">{stats.donePoints} / {stats.totalPoints} story points completed ({pointsPercent}%)</Typography>
            <LinearProgress variant="determinate" value={pointsPercent} aria-label={t('Story point completion')} />
          </Stack>
        </Stack>
      </Paper>

      <SprintSummaryPanel sprint={sprint} projectId={projectId} />

      {moveMutation.error ? (
        <Alert
          severity="error"
          action={moveMutation.variables ? (
            <Button color="inherit" size="small" onClick={() => moveMutation.mutate(moveMutation.variables)} disabled={moveMutation.isPending}>
              {t('Retry')}
            </Button>
          ) : undefined}
        >
          {moveMutation.error instanceof ApiError ? moveMutation.error.message : t('Todo move failed.')}
        </Alert>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={(event) => {
          const activeTodo = todos.find((todo) => todo.id === event.active.id);
          setDragAnnouncement(activeTodo ? `Dragging ${activeTodo.key}` : 'Dragging Todo');
        }}
        onDragOver={(event) => {
          const targetStatus = event.over?.data.current?.status as TodoStatus | undefined;
          setDragAnnouncement(targetStatus ? `Drop target: ${columnLabels[targetStatus]}` : 'Drop target: Todo');
        }}
        onDragEnd={(event) => {
          onDragEnd(event);
          const targetStatus = event.over?.data.current?.status as TodoStatus | undefined;
          setDragAnnouncement(targetStatus ? `Todo moved to ${columnLabels[targetStatus]}` : 'Drag cancelled');
        }}
        onDragCancel={() => setDragAnnouncement('Drag cancelled')}
      >
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(4, minmax(min(86vw, 320px), 1fr))',
            md: 'repeat(4, minmax(280px, 1fr))',
            xl: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 1.5,
          alignItems: 'start',
          minWidth: 0,
          overflowX: 'auto',
          overscrollBehaviorX: 'contain',
          scrollSnapType: { xs: 'x mandatory', md: 'x proximity' },
          pb: 1,
        }}>
          {TODO_STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              todos={board.columns[status]}
              onOpen={setSelectedTodo}
              onStatusChange={changeStatus}
            />
          ))}
        </Box>
      </DndContext>
      <Box
        role="status"
        aria-live="polite"
        sx={{ position: 'absolute', width: 1, height: 1, p: 0, m: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
      >
        {dragAnnouncement}
      </Box>

      {selectedTodo ? (
        <TodoDetailsDialog
          key={selectedTodo.id}
          projectId={projectId}
          todo={selectedTodo}
          onClose={() => setSelectedTodo(null)}
        />
      ) : null}
      {completeOpen ? (
        <CompleteSprintDialog
          sprint={sprint}
          plannedSprints={plannedSprints}
          todos={todos}
          pending={completeMutation.isPending}
          error={completeMutation.error instanceof Error ? completeMutation.error.message : null}
          onClose={() => setCompleteOpen(false)}
          onSubmit={(destination, generateSummary) =>
            completeMutation.mutateAsync({ destination, generateSummary }).then(
              () => undefined,
              () => undefined,
            )}
        />
      ) : null}
    </Stack>
  );
}
