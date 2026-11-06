import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AddOutlined from '@mui/icons-material/AddOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import DragIndicatorOutlined from '@mui/icons-material/DragIndicatorOutlined';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useFeedback } from '../../../app/providers/use-feedback';
import { ApiError } from '../../../shared/api/errors';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/components/ui';
import type { Sprint, Todo, TodoPriority, TodoType } from '../../../shared/types/api';
import { TODO_PRIORITIES, TODO_TYPES } from '../../../shared/types/api';
import { createTodo, moveTodo, updateTodo } from '../api/todos-api';
import { GenerateTodosDialog } from '../components/GenerateTodosDialog';
import { TodoDetailsDialog } from '../components/TodoDetailsDialog';
import { backlogQueryKey, todosQueryKey, useBacklog } from '../hooks/use-backlog';
import { SprintSections } from '../../sprints/components/SprintSections';
import { useSprints } from '../../sprints/hooks/use-sprints';
import { useLocale } from '../../../app/providers/use-locale';

const priorityColors: Record<TodoPriority, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'info',
  medium: 'default',
  high: 'warning',
  urgent: 'error',
};
const EMPTY_TODOS: Todo[] = [];

function labelFor(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function TodoRow({
  todo,
  index,
  disabled,
  onOpen,
  onMove,
  sprints,
  onAssign,
}: {
  todo: Todo;
  index: number;
  disabled: boolean;
  onOpen: () => void;
  onMove: (position: number) => void;
  sprints: Sprint[];
  onAssign: (sprintId: string) => void;
}) {
  const { t } = useLocale();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled,
  });

  function stop(event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
  }

  return (
    <Paper
      ref={setNodeRef}
      role="group"
      variant="outlined"
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: 'pointer',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
    >
      <Tooltip title={t(disabled ? 'Clear search and filters to drag reorder' : 'Drag to reorder')}>
        <span>
          <IconButton
            size="small"
            aria-label={`${t('Reorder')} ${todo.key}`}
            disabled={disabled}
            {...attributes}
            {...listeners}
            onClick={stop}
            sx={{ cursor: disabled ? 'default' : 'grab', touchAction: 'none' }}
          >
            <DragIndicatorOutlined fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Box
        component="button"
        type="button"
        onClick={onOpen}
        sx={{
          flex: 1,
          minWidth: 0,
          p: 0,
          border: 0,
          bgcolor: 'transparent',
          color: 'inherit',
          textAlign: 'left',
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ fontWeight: 700 }} color="text.secondary">{todo.key}</Typography>
          <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{todo.title}</Typography>
        </Stack>
        {todo.description ? (
          <Typography variant="body2" color="text.secondary" sx={{
            mt: 0.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {todo.description}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
          <Chip size="small" variant="outlined" label={labelFor(todo.type)} />
          <Chip size="small" color={priorityColors[todo.priority]} label={labelFor(todo.priority)} />
          {todo.storyPoints !== null ? <Chip size="small" variant="outlined" label={`${todo.storyPoints} pts`} /> : null}
          {todo.labels.map((label) => <Chip key={label} size="small" variant="outlined" label={label} />)}
          {todo.dueDate ? <Typography variant="caption" color="text.secondary">Due {todo.dueDate}</Typography> : null}
        </Stack>
      </Box>
      <IconButton
        aria-label={`${t('More actions for')} ${todo.key}`}
        aria-haspopup="menu"
        onClick={(event) => {
          stop(event);
          setMenuAnchor(event.currentTarget);
        }}
        onKeyDown={stop}
        size="small"
      >
        <MoreVertOutlined />
      </IconButton>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        onClick={stop}
      >
        <MenuItem
          disabled={index === 0}
          onClick={() => {
            setMenuAnchor(null);
            onMove(0);
          }}
        >
          {t('Move to top')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onMove(Number.MAX_SAFE_INTEGER);
          }}
        >
          {t('Move to bottom')}
        </MenuItem>
        {sprints.length ? <MenuItem disabled>{t('Move to Sprint')}</MenuItem> : null}
        {sprints.map((sprint) => (
          <MenuItem
            key={sprint.id}
            onClick={() => {
              setMenuAnchor(null);
              onAssign(sprint.id);
            }}
          >
            {sprint.name}{sprint.status === 'active' ? ` (${t('Active')})` : ''}
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
}

export function BacklogPage() {
  const { projectId = '' } = useParams();
  const { t } = useLocale();
  const { data, isLoading, isError, error, refetch } = useBacklog(projectId);
  const sprintsQuery = useSprints(projectId);
  const openSprints: Sprint[] = sprintsQuery.data?.sprints.filter(
    (sprint) => sprint.status === 'planned' || sprint.status === 'active',
  ) ?? [];
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const todos = data?.todos ?? EMPTY_TODOS;
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<TodoPriority | ''>('');
  const [typeFilter, setTypeFilter] = useState<TodoType | ''>('');
  const quickInput = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filteredTodos = useMemo(
    () => todos.filter((todo) => {
      const matchesSearch = !debouncedSearch || [
        todo.key,
        todo.title,
        todo.description,
        ...todo.labels,
      ].some((value) => value.toLowerCase().includes(debouncedSearch));
      return matchesSearch && (!priorityFilter || todo.priority === priorityFilter) && (!typeFilter || todo.type === typeFilter);
    }),
    [todos, debouncedSearch, priorityFilter, typeFilter],
  );
  const filtersActive = Boolean(search.trim() || priorityFilter || typeFilter);
  const totalPoints = todos.reduce((sum, todo) => sum + (todo.storyPoints ?? 0), 0);

  const createMutation = useMutation({
    mutationFn: (title: string) => createTodo(projectId, { title }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: todosQueryKey(projectId) });
      setQuickTitle('');
      setQuickError(null);
      window.requestAnimationFrame(() => quickInput.current?.focus());
    },
    onError: (failure: unknown) => {
      setQuickError(failure instanceof ApiError ? failure.message : 'Unable to create the Todo. Please try again.');
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ todo, sprintId }: { todo: Todo; sprintId: string }) =>
      updateTodo(todo.id, { sprintId }),
    onSuccess: async ({ todo }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: todosQueryKey(projectId) }),
        queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
      ]);
      notify(`${todo.key} moved to a Sprint.`);
    },
    onError: (failure: unknown) => {
      notify(failure instanceof Error ? failure.message : 'Unable to move the Todo.', 'error');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ todoId, position }: { todoId: string; position: number }) =>
      moveTodo(todoId, { position }),
    onMutate: async ({ todoId, position }) => {
      await queryClient.cancelQueries({ queryKey: backlogQueryKey(projectId) });
      const previous = queryClient.getQueryData<{ todos: Todo[] }>(backlogQueryKey(projectId));
      if (previous) {
        const fromIndex = previous.todos.findIndex((todo) => todo.id === todoId);
        if (fromIndex !== -1) {
          const targetIndex = Math.min(position, previous.todos.length - 1);
          const reordered = arrayMove(previous.todos, fromIndex, targetIndex).map((todo, index) => ({ ...todo, order: index }));
          queryClient.setQueryData(backlogQueryKey(projectId), { ...previous, todos: reordered });
        }
      }
      return { previous };
    },
    onError: (failure: unknown, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(backlogQueryKey(projectId), context.previous);
      notify(failure instanceof Error ? `Todo reorder failed: ${failure.message}` : 'Todo reorder failed. The previous order was restored.', 'error');
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: backlogQueryKey(projectId) });
      await queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
    },
  });

  function submitQuickCreate() {
    const title = quickTitle.trim();
    if (!title || createMutation.isPending) return;
    setQuickError(null);
    createMutation.mutate(title);
  }

  function handleQuickKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitQuickCreate();
    } else if (event.key === 'Escape') {
      setQuickTitle('');
      setQuickError(null);
      event.currentTarget.blur();
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    if (filtersActive || !event.over || event.active.id === event.over.id) return;
    const from = todos.findIndex((todo) => todo.id === event.active.id);
    const to = todos.findIndex((todo) => todo.id === event.over?.id);
    if (from === -1 || to === -1) return;
    reorderMutation.mutate({ todoId: String(event.active.id), position: to });
  }

  function moveToPosition(todo: Todo, position: number) {
    if (reorderMutation.isPending) return;
    reorderMutation.mutate({ todoId: todo.id, position });
  }

  if (isLoading) {
    return <LoadingState label="Loading backlog" rows={4} />;
  }

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Unable to load the backlog.'}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography component="h1" variant="h2">{t('Backlog')}</Typography>
          <Typography color="text.secondary">
            {todos.length} Todo{todos.length === 1 ? '' : 's'} · {totalPoints} story point{totalPoints === 1 ? '' : 's'}
            {filtersActive ? ` · Showing ${filteredTodos.length}` : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button variant="ai" startIcon={<AutoAwesomeOutlined />} onClick={() => setGenerateOpen(true)}>
            {t('Generate Todos with AI')}
          </Button>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => quickInput.current?.focus()}>
            {t('Create a Todo')}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', xl: 'minmax(0, 1.8fr) minmax(320px, .8fr)' },
        gridTemplateAreas: { xs: '"backlog" "sprints"', xl: '"backlog sprints"' },
        alignItems: 'start',
        gap: 2,
      }}>
        <Box sx={{ gridArea: 'sprints', minWidth: 0 }}>
          <SprintSections projectId={projectId} onTodoOpen={setSelectedTodo} />
        </Box>
        <Stack spacing={1.5} sx={{ gridArea: 'backlog', minWidth: 0 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label={t('Search backlog')}
              placeholder={t('Key, title, description, or label')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              fullWidth
              size="small"
            />
            <FormControl size="small" sx={{ minWidth: { md: 170 } }}>
              <InputLabel id="backlog-priority-label">{t('Priority')}</InputLabel>
              <Select
                labelId="backlog-priority-label"
                label={t('Priority')}
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as TodoPriority | '')}
              >
                <MenuItem value="">{t('All priorities')}</MenuItem>
                {TODO_PRIORITIES.map((priority) => <MenuItem key={priority} value={priority}>{t(labelFor(priority))}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { md: 150 } }}>
              <InputLabel id="backlog-type-label">{t('Type')}</InputLabel>
              <Select
                labelId="backlog-type-label"
                label={t('Type')}
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as TodoType | '')}
              >
                <MenuItem value="">{t('All types')}</MenuItem>
                {TODO_TYPES.map((type) => <MenuItem key={type} value={type}>{t(labelFor(type))}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          {filtersActive ? (
            <Alert severity="info">
              {t('Drag reordering is disabled while search or filters are active. Clear them to reorder the backlog.')}
            </Alert>
          ) : null}

          {todos.length === 0 ? (
            <Paper variant="outlined">
              <EmptyState
                title="Your backlog is empty"
                description="Create a Todo or get a first draft from AI."
                action={(
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Button variant="contained" onClick={() => quickInput.current?.focus()}>{t('Create a Todo')}</Button>
                    <Button variant="ai" startIcon={<AutoAwesomeOutlined />} onClick={() => setGenerateOpen(true)}>
                      {t('Generate Todos with AI')}
                    </Button>
                  </Stack>
                )}
              />
            </Paper>
          ) : filteredTodos.length === 0 ? (
            <Paper variant="outlined">
              <EmptyState title="No matching Todos" description="Try a different search or clear the filters." />
            </Paper>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={filteredTodos.map((todo) => todo.id)} strategy={verticalListSortingStrategy}>
                <Stack spacing={1}>
                  {filteredTodos.map((todo) => (
                    <TodoRow
                      key={todo.id}
                      todo={todo}
                      index={todos.findIndex((item) => item.id === todo.id)}
                      disabled={filtersActive || reorderMutation.isPending}
                      onOpen={() => setSelectedTodo(todo)}
                      onMove={(position) => moveToPosition(todo, position)}
                      sprints={openSprints}
                      onAssign={(sprintId) => assignMutation.mutate({ todo, sprintId })}
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>
          )}

          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
              <TextField
                inputRef={quickInput}
                fullWidth
                size="small"
                placeholder={t('+ Create todo')}
                slotProps={{ htmlInput: { 'aria-label': t('Create todo') } }}
                value={quickTitle}
                onChange={(event) => {
                  setQuickTitle(event.target.value);
                  setQuickError(null);
                }}
                onKeyDown={handleQuickKeyDown}
                error={Boolean(quickError)}
                helperText={quickError ?? (createMutation.isPending ? t('Creating Todo…') : t('Press Enter to create · Escape to cancel'))}
                disabled={createMutation.isPending}
              />
              {createMutation.isPending ? <CircularProgress size={24} sx={{ mt: 1 }} /> : null}
            </Stack>
          </Paper>
        </Stack>
      </Box>

      {selectedTodo ? (
        <TodoDetailsDialog
          key={selectedTodo.id}
          projectId={projectId}
          todo={selectedTodo}
          onClose={() => setSelectedTodo(null)}
        />
      ) : null}
      {generateOpen ? (
        <GenerateTodosDialog projectId={projectId} onClose={() => setGenerateOpen(false)} />
      ) : null}
    </Stack>
  );
}
