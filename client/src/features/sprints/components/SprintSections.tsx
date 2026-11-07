import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDroppable } from '@dnd-kit/core';
import { Link, useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import { getFieldErrors } from '../../../shared/api/errors';
import { useFeedback } from '../../../app/providers/use-feedback';
import type { CreateSprintRequest, Sprint, Todo, UpdateSprintRequest } from '../../../shared/types/api';
import { deleteSprint, createSprint, startSprint, updateSprint } from '../api/sprints-api';
import { listTodos, updateTodo } from '../../todos/api/todos-api';
import { TodoDetailsDialog } from '../../todos/components/TodoDetailsDialog';
import { todosQueryKey } from '../../todos/hooks/use-backlog';
import { sprintsQueryKey, useSprints } from '../hooks/use-sprints';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/ui';
import { PriorityBadge, TaskTypeBadge, TodoStatusBadge } from '../../../shared/components/ui';
import { todoTypeAccentSx } from '../../../shared/components/todo-visuals';
import { useLocale } from '../../../app/providers/use-locale';
import { localDate } from '../../../shared/utils/dates';

function dateLabel(date: string | null): string {
  if (!date) return 'Not set';
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en', { timeZone: 'UTC' });
}

function SprintFormDialog({
  sprint,
  suggestedName,
  pending,
  onClose,
  onSubmit,
}: {
  sprint?: Sprint;
  suggestedName: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: UpdateSprintRequest) => Promise<void>;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(sprint?.name ?? suggestedName);
  const [goal, setGoal] = useState(sprint?.goal ?? '');
  const [startDate, setStartDate] = useState(sprint?.startDate ?? '');
  const [endDate, setEndDate] = useState(sprint?.endDate ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const validation: Record<string, string> = {};
    if (!name.trim()) validation.name = t('Name is required.');
    else if (name.trim().length > 80) validation.name = t('Name must be 80 characters or fewer.');
    if (goal.length > 300) validation.goal = t('Goal must be 300 characters or fewer.');
    if (startDate && endDate && endDate < startDate) {
      validation.endDate = t('End date must be on or after the start date.');
    }
    setErrors(validation);
    setServerError(null);
    if (Object.keys(validation).length) return;

    const input = {
      name: name.trim(),
      goal: goal.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
    };
    try {
      await onSubmit(input);
      onClose();
    } catch (failure) {
      const fieldErrors = getFieldErrors(failure);
      setErrors(fieldErrors);
      setServerError(Object.keys(fieldErrors).length
        ? null
        : failure instanceof Error ? failure.message : t('Unable to save the Sprint.'));
    }
  }

  return (
    <Dialog open onClose={pending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="sprint-form-title">
      <DialogTitle id="sprint-form-title">{t(sprint ? 'Edit Sprint' : 'Create Sprint')}</DialogTitle>
      <form onSubmit={handleSubmit} noValidate aria-busy={pending}>
        <DialogContent dividers>
          <Stack spacing={2}>
            {serverError ? <Alert severity="error" role="alert">{serverError}</Alert> : null}
            <TextField
              label={t('Name')}
              required
              autoFocus
              fullWidth
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={Boolean(errors.name)}
              helperText={errors.name || ' '}
              slotProps={{ htmlInput: { maxLength: 80 } }}
            />
            <TextField
              label={t('Goal')}
              fullWidth
              multiline
              minRows={2}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              error={Boolean(errors.goal)}
              helperText={errors.goal || `${goal.length}/300 characters`}
              slotProps={{ htmlInput: { maxLength: 300 } }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('Start date')}
                type="date"
                fullWidth
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.startDate)}
                helperText={errors.startDate || ' '}
              />
              <TextField
                label={t('End date')}
                type="date"
                fullWidth
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.endDate)}
                helperText={errors.endDate || ' '}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={pending}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
            {t(sprint ? 'Save changes' : 'Create Sprint')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function StartSprintDialog({
  sprint,
  pending,
  onClose,
  onSubmit,
}: {
  sprint: Sprint;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: { startDate: string; endDate: string }) => Promise<void>;
}) {
  const { t } = useLocale();
  const today = localDate(new Date());
  const twoWeeks = new Date();
  twoWeeks.setDate(twoWeeks.getDate() + 14);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(localDate(twoWeeks));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const validation: Record<string, string> = {};
    if (!startDate) validation.startDate = t('Start date is required.');
    if (!endDate) validation.endDate = t('End date is required.');
    else if (startDate && endDate < startDate) validation.endDate = t('End date must be on or after the start date.');
    setErrors(validation);
    setServerError(null);
    if (Object.keys(validation).length) return;

    try {
      await onSubmit({ startDate, endDate });
    } catch (failure) {
      const fieldErrors = getFieldErrors(failure);
      setErrors(fieldErrors);
      setServerError(Object.keys(fieldErrors).length
        ? null
        : failure instanceof Error ? failure.message : t('Unable to start this Sprint.'));
    }
  }

  return (
    <Dialog open onClose={pending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="start-sprint-title">
      <DialogTitle id="start-sprint-title">{t('Start')} {sprint.name}</DialogTitle>
      <form onSubmit={handleSubmit} noValidate aria-busy={pending}>
        <DialogContent dividers>
          <Stack spacing={2}>
            {serverError ? <Alert severity="error" role="alert">{serverError}</Alert> : null}
            <TextField
              label={t('Start date')}
              type="date"
              required
              fullWidth
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              error={Boolean(errors.startDate)}
              helperText={errors.startDate || ' '}
            />
            <TextField
              label={t('End date')}
              type="date"
              required
              fullWidth
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              error={Boolean(errors.endDate)}
              helperText={errors.endDate || ' '}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={pending}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
            {t('Start Sprint')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function SprintTodoRow({
  todo,
  onOpen,
  onMoveToBacklog,
}: {
  todo: Todo;
  onOpen: () => void;
  onMoveToBacklog: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const { t } = useLocale();
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 1.5,
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        '&:hover': { borderColor: 'primary.light' },
        ...todoTypeAccentSx(todo.type),
      }}
    >
      <Button
        onClick={onOpen}
        sx={{ flex: 1, minWidth: 0, justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none', whiteSpace: 'normal', '&:hover': { bgcolor: 'transparent' } }}
      >
        <Stack sx={{ minWidth: 0, alignItems: 'flex-start', width: '100%' }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', flexWrap: 'wrap', mb: 0.25 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 700, fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace', letterSpacing: '0.02em', flexShrink: 0 }}
            >
              {todo.key}
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', overflowWrap: 'anywhere', textAlign: 'left', lineHeight: 1.45 }}>
              {todo.title}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', mt: 0.5 }}>
            <TaskTypeBadge type={todo.type} />
            <TodoStatusBadge status={todo.status} />
            <PriorityBadge priority={todo.priority} />
          </Stack>
        </Stack>
      </Button>
      <IconButton
        aria-label={`${t('More actions for')} ${todo.key}`}
        aria-haspopup="menu"
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVertOutlined />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); onMoveToBacklog(); }}>{t('Move to backlog')}</MenuItem>
      </Menu>
    </Paper>
  );
}

function SprintSection({
  sprint,
  onEdit,
  onDelete,
  onStart,
  hasActiveSprint,
  onTodoOpen,
  onTodoMoved,
}: {
  sprint: Sprint;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onStart: () => void;
  hasActiveSprint: boolean;
  onTodoOpen: (todo: Todo) => void;
  onTodoMoved: (todo: Todo) => void;
}) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(sprint.status === 'active');
  const { setNodeRef, isOver } = useDroppable({
    id: `sprint-${sprint.id}`,
    data: { sprintId: sprint.id },
    disabled: sprint.status === 'completed',
  });
  const todosQuery = useQuery({
    queryKey: [...todosQueryKey(sprint.projectId), sprint.id],
    queryFn: () => listTodos(sprint.projectId, { sprintId: sprint.id }),
    enabled: expanded && sprint.status !== 'completed',
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const pendingAction = sprint.status === 'planned';

  return (
    <>
      <Accordion
        ref={setNodeRef}
        disableGutters
        variant="outlined"
        expanded={expanded}
        onChange={(_event, isExpanded) => setExpanded(isExpanded)}
        sx={{
          borderColor: isOver ? 'primary.main' : undefined,
          bgcolor: isOver ? 'action.hover' : undefined,
          transition: 'border-color 120ms ease, background-color 120ms ease',
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreOutlined />} aria-controls={`sprint-${sprint.id}-content`}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 2 }} sx={{ width: '100%', alignItems: { sm: 'center' }, pr: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere', minWidth: 0 }}>{sprint.name}</Typography>
              <Chip
                size="small"
                color={sprint.status === 'active' ? 'success' : sprint.status === 'completed' ? 'default' : 'primary'}
                label={t(sprint.status)}
              />
              <Typography variant="body2" color="text.secondary">
                {sprint.stats.totalTodos} {t('Todos')} · {sprint.stats.totalPoints} {t('points')}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {dateLabel(sprint.startDate)} – {dateLabel(sprint.endDate)}
            </Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails id={`sprint-${sprint.id}-content`}>
          <Stack spacing={1.5}>
            {sprint.goal ? <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{sprint.goal}</Typography> : <Typography color="text.secondary">{t('No goal set.')}</Typography>}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              {pendingAction ? (
                <>
                  <Button size="small" onClick={onEdit}>{t('Edit')}</Button>
                  <Button size="small" color="error" onClick={() => { setDeleteError(null); setDeleteOpen(true); }}>{t('Delete')}</Button>
                  <Tooltip title={hasActiveSprint ? t('Complete the active Sprint before starting another.') : ''}>
                    <span>
                      <Button size="small" variant="contained" disabled={hasActiveSprint} onClick={onStart}>{t('Start Sprint')}</Button>
                    </span>
                  </Tooltip>
                  {hasActiveSprint ? (
                    <Typography variant="caption" color="text.secondary">
                      {t('Start is unavailable while another Sprint is active.')}
                    </Typography>
                  ) : null}
                </>
              ) : sprint.status === 'completed' ? (
                <Button size="small" component={Link} to={`/projects/${sprint.projectId}/sprints/${sprint.id}`}>
                  {t('View details')}
                </Button>
              ) : (
                <Button size="small" component={Link} to={`/projects/${sprint.projectId}/board`}>
                  {t('Open board')}
                </Button>
              )}
            </Stack>
            {todosQuery.isError ? <ErrorState message={todosQuery.error instanceof Error ? todosQuery.error.message : t('Unable to load Todos for Sprint')} onRetry={() => void todosQuery.refetch()} /> : null}
            {todosQuery.isLoading ? <LoadingState label="Loading Sprint Todos" rows={1} /> : null}
            {todosQuery.data?.todos.length ? (
              <Stack spacing={1}>
                {todosQuery.data.todos.map((todo) => (
                  <SprintTodoRow
                    key={todo.id}
                    todo={todo}
                    onOpen={() => onTodoOpen(todo)}
                    onMoveToBacklog={() => onTodoMoved(todo)}
                  />
                ))}
              </Stack>
            ) : null}
            {sprint.status !== 'completed' && !todosQuery.isLoading && !todosQuery.isError && !todosQuery.data?.todos.length ? (
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', textAlign: 'center' }}>
                <EmptyState title="No Todos assigned to this Sprint." />
              </Box>
            ) : null}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {deleteOpen ? (
        <DeleteSprintDialog
          sprint={sprint}
          error={deleteError}
          onClose={() => setDeleteOpen(false)}
          onConfirm={async () => {
            try {
              await onDelete();
              setDeleteOpen(false);
            } catch (failure) {
              setDeleteError(failure instanceof Error ? failure.message : 'Unable to delete this Sprint.');
            }
          }}
        />
      ) : null}
    </>
  );
}

function DeleteSprintDialog({
  sprint,
  error,
  onClose,
  onConfirm,
}: {
  sprint: Sprint;
  error: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [pending, setPending] = useState(false);
  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open onClose={pending ? undefined : onClose} aria-labelledby="delete-sprint-title">
      <DialogTitle id="delete-sprint-title">{t('Delete')} {sprint.name}?</DialogTitle>
      <DialogContent>
        <Stack spacing={1}>
          <Typography>{t('Delete this planned Sprint? Its Todos will be returned to the backlog.')}</Typography>
          {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>{t('Cancel')}</Button>
        <Button color="error" variant="contained" onClick={() => void confirm()} disabled={pending}>
          {pending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
          {t('Delete Sprint')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function SprintSections({
  projectId,
  onTodoOpen,
}: {
  projectId: string;
  onTodoOpen?: (todo: Todo) => void;
}) {
  const { t } = useLocale();
  const { data, isLoading, isError, error, refetch } = useSprints(projectId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const [formSprint, setFormSprint] = useState<Sprint | null | undefined>(undefined);
  const [startSprintTarget, setStartSprintTarget] = useState<Sprint | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const sprintStatusOrder: Record<Sprint['status'], number> = {
    planned: 0,
    active: 1,
    completed: 2,
  };
  const sprints = [...(data?.sprints ?? [])].sort(
    (first, second) => sprintStatusOrder[first.status] - sprintStatusOrder[second.status],
  );
  const hasActiveSprint = sprints.some((sprint) => sprint.status === 'active');
  const plannedSprints = sprints.filter((sprint) => sprint.status === 'planned');
  const nextNumber = sprints.reduce((max, sprint) => {
    const match = /^Sprint\s+(\d+)$/i.exec(sprint.name);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: sprintsQueryKey(projectId) }),
      queryClient.invalidateQueries({ queryKey: todosQueryKey(projectId) }),
      queryClient.invalidateQueries({ queryKey: ['sprint-board'] }),
      queryClient.invalidateQueries({ queryKey: ['sprint-todos'] }),
      queryClient.invalidateQueries({ queryKey: ['sprint'] }),
    ]);
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateSprintRequest) => createSprint(projectId, input),
    onSuccess: async ({ sprint }) => {
      await refresh();
      notify(`${sprint.name} created.`);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSprintRequest }) => updateSprint(id, input),
    onSuccess: async ({ sprint }) => {
      await refresh();
      notify(`${sprint.name} updated.`);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (sprint: Sprint) => deleteSprint(sprint.id),
    onSuccess: async (_result, sprint) => {
      await refresh();
      notify(`${sprint.name} deleted; its Todos were returned to the backlog.`);
    },
  });
  const startMutation = useMutation({
    mutationFn: ({ sprintId, dates }: { sprintId: string; dates: { startDate: string; endDate: string } }) =>
      startSprint(sprintId, dates),
    onSuccess: async ({ sprint }) => {
      await refresh();
      notify(`${sprint.name} started.`);
      setStartSprintTarget(null);
      navigate(`/projects/${projectId}/board`);
    },
  });
  const moveMutation = useMutation({
    mutationFn: (todo: Todo) => updateTodo(todo.id, { sprintId: null }),
    onSuccess: async () => {
      await refresh();
      notify('Todo moved to the backlog.');
    },
    onError: (failure: unknown) => notify(failure instanceof Error ? failure.message : 'Unable to move the Todo.', 'error'),
  });
  async function saveSprint(input: CreateSprintRequest | UpdateSprintRequest) {
    if (formSprint) {
      await updateMutation.mutateAsync({
        id: formSprint.id,
        input: {
          name: input.name,
          goal: input.goal,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });
    }
    else await createMutation.mutateAsync(input);
  }

  async function startSelectedSprint(dates: { startDate: string; endDate: string }) {
    if (!startSprintTarget) return;
    await startMutation.mutateAsync({ sprintId: startSprintTarget.id, dates });
  }

  const formPending = createMutation.isPending || updateMutation.isPending;
  const deletePlannedSprint = async (sprint: Sprint) => {
    await deleteMutation.mutateAsync(sprint);
  };
  const openTodo = (todo: Todo) => {
    if (onTodoOpen) onTodoOpen(todo);
    else setSelectedTodo(todo);
  };

  if (isLoading) return <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}><LoadingState label="Loading Sprints" rows={2} /></Paper>;
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'Unable to load Sprints.'} onRetry={() => void refetch()} />;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: 'background.paper' }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography component="h2" variant="h3">{t('Sprints')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {plannedSprints.length} {t('planned Sprints')}
              {hasActiveSprint ? ` · ${t('One active Sprint')}` : ''}
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<AddOutlined />} onClick={() => { createMutation.reset(); setFormSprint(null); }}>
            {t('Create Sprint')}
          </Button>
        </Stack>

        {sprints.length ? (
          <Stack spacing={1}>
            {sprints.map((sprint) => (
              <SprintSection
                key={sprint.id}
                sprint={sprint}
                onEdit={() => { updateMutation.reset(); setFormSprint(sprint); }}
                onDelete={() => deletePlannedSprint(sprint)}
                onStart={() => { startMutation.reset(); setStartSprintTarget(sprint); }}
                hasActiveSprint={hasActiveSprint}
                onTodoOpen={openTodo}
                onTodoMoved={(todo) => moveMutation.mutate(todo)}
              />
            ))}
          </Stack>
        ) : (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <EmptyState
              title="No Sprints yet"
              description="Create a Sprint to start planning."
            />
          </Box>
        )}

        {formSprint !== undefined ? (
          <SprintFormDialog
            key={formSprint?.id ?? 'new'}
            sprint={formSprint ?? undefined}
            suggestedName={`Sprint ${nextNumber}`}
            pending={formPending}
            onClose={() => setFormSprint(undefined)}
            onSubmit={saveSprint}
          />
        ) : null}
        {startSprintTarget ? (
          <StartSprintDialog
            sprint={startSprintTarget}
            pending={startMutation.isPending}
            onClose={() => setStartSprintTarget(null)}
            onSubmit={startSelectedSprint}
          />
        ) : null}
        {selectedTodo ? (
          <TodoDetailsDialog
            key={selectedTodo.id}
            projectId={projectId}
            todo={selectedTodo}
            onClose={() => setSelectedTodo(null)}
          />
        ) : null}
      </Stack>
    </Paper>
  );
}
