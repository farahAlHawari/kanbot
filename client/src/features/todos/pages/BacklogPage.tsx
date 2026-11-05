import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import DragIndicatorOutlined from '@mui/icons-material/DragIndicatorOutlined';
import MoreVertOutlined from '@mui/icons-material/MoreVertOutlined';
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { useFeedback } from '../../../app/providers/use-feedback';
import { ApiError } from '../../../shared/api/errors';
import { ErrorState } from '../../../shared/components/ui';
import type { Sprint, Todo, TodoPriority, TodoType } from '../../../shared/types/api';
import { TODO_PRIORITIES, TODO_TYPES } from '../../../shared/types/api';
import { createTodo, listTodos, moveTodo } from '../api/todos-api';
import { listSprints } from '../../sprints/api/sprints-api';
import { GenerateTodosDialog } from '../components/GenerateTodosDialog';
import { TodoDetailsDialog } from '../components/TodoDetailsDialog';
import { backlogQueryKey, todosQueryKey, useBacklog } from '../hooks/use-backlog';

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
}: {
  todo: Todo;
  index: number;
  disabled: boolean;
  onOpen: () => void;
  onMove: (position: number) => void;
}) {
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
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
      }}
    >
      <Tooltip title={disabled ? 'Clear search and filters to drag reorder' : 'Drag to reorder'}>
        <span>
          <IconButton
            size="small"
            aria-label={`Reorder ${todo.key}`}
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
        aria-label={`More actions for ${todo.key}`}
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
          Move to top
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onMove(Number.MAX_SAFE_INTEGER);
          }}
        >
          Move to bottom
        </MenuItem>
      </Menu>
    </Paper>
  );
}

function SprintTodoRow({ todo, onOpen }: { todo: Todo; onOpen: () => void }) {
  return (
    <Paper
      variant="outlined"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      sx={{ p: 1.5, cursor: 'pointer', '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' } }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ fontWeight: 700 }} color="text.secondary">{todo.key}</Typography>
        <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{todo.title}</Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
        <Chip size="small" variant="outlined" label={labelFor(todo.type)} />
        <Chip size="small" color={priorityColors[todo.priority]} label={labelFor(todo.priority)} />
        {todo.storyPoints !== null ? <Chip size="small" variant="outlined" label={`${todo.storyPoints} pts`} /> : null}
      </Stack>
    </Paper>
  );
}

export function BacklogPage() {
  const { projectId = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useBacklog(projectId);
  const sprintsQuery = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => listSprints(projectId),
    enabled: projectId.length > 0,
  });
  const openSprints: Sprint[] = sprintsQuery.data?.sprints.filter(
    (sprint) => sprint.status === 'planned' || sprint.status === 'active',
  ) ?? [];
  const sprintTodosQueries = useQueries({
    queries: openSprints.map((sprint) => ({
      queryKey: [...todosQueryKey(projectId), sprint.id],
      queryFn: () => listTodos(projectId, { sprintId: sprint.id }),
    })),
  });
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
    return (
      <Stack spacing={1}>
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} height={88} />)}
      </Stack>
    );
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
          <Typography component="h1" variant="h2">Backlog</Typography>
          <Typography color="text.secondary">
            {todos.length} Todo{todos.length === 1 ? '' : 's'} · {totalPoints} story point{totalPoints === 1 ? '' : 's'}
            {filtersActive ? ` · Showing ${filteredTodos.length}` : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<AutoAwesomeOutlined />} onClick={() => setGenerateOpen(true)}>
            Generate Todos with AI
          </Button>
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => quickInput.current?.focus()}>
            Create Todo
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <TextField
          label="Search backlog"
          placeholder="Key, title, description, or label"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          fullWidth
          size="small"
        />
        <FormControl size="small" sx={{ minWidth: { md: 170 } }}>
          <InputLabel id="backlog-priority-label">Priority</InputLabel>
          <Select
            labelId="backlog-priority-label"
            label="Priority"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as TodoPriority | '')}
          >
            <MenuItem value="">All priorities</MenuItem>
            {TODO_PRIORITIES.map((priority) => <MenuItem key={priority} value={priority}>{labelFor(priority)}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: { md: 150 } }}>
          <InputLabel id="backlog-type-label">Type</InputLabel>
          <Select
            labelId="backlog-type-label"
            label="Type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as TodoType | '')}
          >
            <MenuItem value="">All types</MenuItem>
            {TODO_TYPES.map((type) => <MenuItem key={type} value={type}>{labelFor(type)}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {filtersActive ? (
        <Alert severity="info">
          Drag reordering is disabled while search or filters are active. Clear them to reorder the backlog.
        </Alert>
      ) : null}

      {todos.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography component="h2" variant="h3" gutterBottom>Your backlog is empty</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Create a Todo or get a first draft from AI.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={() => quickInput.current?.focus()}>Create a Todo</Button>
            <Button variant="outlined" startIcon={<AutoAwesomeOutlined />} onClick={() => setGenerateOpen(true)}>
              Generate Todos with AI
            </Button>
          </Stack>
        </Paper>
      ) : filteredTodos.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography component="h2" variant="h3" gutterBottom>No matching Todos</Typography>
          <Typography color="text.secondary">Try a different search or clear the filters.</Typography>
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
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      )}

      {openSprints.length ? (
        <Box>
          <Typography component="h2" variant="h3" sx={{ mb: 1 }}>Planned and active Sprints</Typography>
          <Stack spacing={1}>
            {openSprints.map((sprint, index) => {
              const sprintTodosQuery = sprintTodosQueries[index];
              const sprintTodos = sprintTodosQuery?.data?.todos ?? [];
              return (
                <Accordion key={sprint.id} disableGutters variant="outlined">
                  <AccordionSummary expandIcon={<ExpandMoreOutlined />}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 600 }}>{sprint.name}</Typography>
                      <Chip
                        size="small"
                        color={sprint.status === 'active' ? 'success' : 'default'}
                        label={sprint.status === 'active' ? 'Active' : 'Planned'}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {sprintTodos.length} Todo{sprintTodos.length === 1 ? '' : 's'}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    {sprintTodosQuery?.isLoading ? (
                      <Stack spacing={1}><Skeleton height={64} /><Skeleton height={64} /></Stack>
                    ) : sprintTodosQuery?.isError ? (
                      <ErrorState message={`Could not load Todos for ${sprint.name}.`} />
                    ) : sprintTodos.length ? (
                      <Stack spacing={1}>
                        {sprintTodos.map((todo) => (
                          <SprintTodoRow key={todo.id} todo={todo} onOpen={() => setSelectedTodo(todo)} />
                        ))}
                      </Stack>
                    ) : (
                      <Typography color="text.secondary">No Todos assigned to this Sprint.</Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        </Box>
      ) : null}

      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <TextField
            inputRef={quickInput}
            fullWidth
            size="small"
            placeholder="+ Create todo"
            slotProps={{ htmlInput: { 'aria-label': 'Create todo' } }}
            value={quickTitle}
            onChange={(event) => {
              setQuickTitle(event.target.value);
              setQuickError(null);
            }}
            onKeyDown={handleQuickKeyDown}
            error={Boolean(quickError)}
            helperText={quickError ?? (createMutation.isPending ? 'Creating Todo…' : 'Press Enter to create · Escape to cancel')}
            disabled={createMutation.isPending}
          />
          {createMutation.isPending ? <CircularProgress size={24} sx={{ mt: 1 }} /> : null}
        </Stack>
      </Paper>

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
