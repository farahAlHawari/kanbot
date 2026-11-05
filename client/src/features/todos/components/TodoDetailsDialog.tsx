import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { listSprints } from '../../sprints/api/sprints-api';
import { useFeedback } from '../../../app/providers/use-feedback';
import { getFieldErrors } from '../../../shared/api/errors';
import type { Sprint, StoryPoints, Todo, TodoPriority, TodoStatus, TodoType, UpdateTodoRequest } from '../../../shared/types/api';
import { STORY_POINTS, TODO_PRIORITIES, TODO_STATUSES, TODO_TYPES } from '../../../shared/types/api';
import { deleteTodo, updateTodo } from '../api/todos-api';
import { todosQueryKey } from '../hooks/use-backlog';

interface TodoFields {
  title: string;
  description: string;
  type: TodoType;
  status: TodoStatus;
  priority: TodoPriority;
  storyPoints: StoryPoints | null;
  labels: string[];
  dueDate: string;
  sprintId: string;
}

function getFields(todo: Todo): TodoFields {
  return {
    title: todo.title,
    description: todo.description,
    type: todo.type,
    status: todo.status,
    priority: todo.priority,
    storyPoints: todo.storyPoints,
    labels: todo.labels,
    dueDate: todo.dueDate ?? '',
    sprintId: todo.sprintId ?? '',
  };
}

function sameFields(first: TodoFields, second: TodoFields): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

function displayLabel(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function TodoDetailsDialog({
  projectId,
  todo,
  onClose,
}: {
  projectId: string;
  todo: Todo;
  onClose: () => void;
}) {
  const initialFields = getFields(todo);
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [labelInput, setLabelInput] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const sprintsQuery = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => listSprints(projectId),
  });
  const sprints: Sprint[] = sprintsQuery.data?.sprints ?? [];

  const saveMutation = useMutation({
    mutationFn: (input: UpdateTodoRequest) => updateTodo(todo.id, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: todosQueryKey(projectId) }),
        queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['sprint-board'] }),
        queryClient.invalidateQueries({ queryKey: ['sprint-todos'] }),
        queryClient.invalidateQueries({ queryKey: ['sprint'] }),
      ]);
      notify(`${todo.key} updated.`);
      onClose();
    },
    onError: (error: unknown) => {
      const fieldErrors = getFieldErrors(error);
      setErrors(Object.fromEntries(
        Object.entries(fieldErrors).map(([field, message]) => [field.split('.')[0], message]),
      ));
      setServerError(Object.keys(fieldErrors).length ? null : error instanceof Error ? error.message : 'Unable to save this Todo.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTodo(todo.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: todosQueryKey(projectId) });
      const previousBacklog = queryClient.getQueryData<{ todos: Todo[] }>([
        ...todosQueryKey(projectId),
        'backlog',
      ]);
      if (previousBacklog) {
        queryClient.setQueryData([...todosQueryKey(projectId), 'backlog'], {
          ...previousBacklog,
          todos: previousBacklog.todos.filter((item) => item.id !== todo.id),
        });
      }
      return { previousBacklog };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: todosQueryKey(projectId) }),
        queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
        queryClient.invalidateQueries({ queryKey: ['sprint-board'] }),
        queryClient.invalidateQueries({ queryKey: ['sprint-todos'] }),
        queryClient.invalidateQueries({ queryKey: ['sprint'] }),
      ]);
      notify(`${todo.key} deleted.`);
      onClose();
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previousBacklog) {
        queryClient.setQueryData([...todosQueryKey(projectId), 'backlog'], context.previousBacklog);
      }
      setServerError(error instanceof Error ? error.message : 'Unable to delete this Todo.');
      setDeleteOpen(false);
    },
  });

  const dirty = !sameFields(initialFields, fields);
  const pending = saveMutation.isPending || deleteMutation.isPending;

  function setField<Key extends keyof TodoFields>(key: Key, value: TodoFields[Key]) {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setServerError(null);
  }

  function requestClose() {
    if (pending) return;
    if (dirty) setDiscardOpen(true);
    else onClose();
  }

  function addLabel() {
    const label = labelInput.trim();
    if (!label || fields.labels.includes(label)) {
      setLabelInput('');
      return;
    }
    if (label.length > 30) {
      setErrors((current) => ({ ...current, labels: 'Each label must be 30 characters or fewer.' }));
      return;
    }
    if (fields.labels.length >= 10) {
      setErrors((current) => ({ ...current, labels: 'A Todo can have at most 10 labels.' }));
      return;
    }
    setField('labels', [...fields.labels, label]);
    setLabelInput('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const validation: Record<string, string> = {};
    if (!fields.title.trim()) validation.title = 'Title is required.';
    else if (fields.title.trim().length > 200) validation.title = 'Title must be 200 characters or fewer.';
    if (fields.description.length > 5000) validation.description = 'Description must be 5000 characters or fewer.';
    if (fields.labels.length > 10 || fields.labels.some((label) => label.length > 30)) {
      validation.labels = 'Use at most 10 labels, each 30 characters or fewer.';
    }
    setErrors(validation);
    setServerError(null);
    if (Object.keys(validation).length) return;

    const input: UpdateTodoRequest = {
      title: fields.title.trim(),
      description: fields.description,
      type: fields.type,
      status: fields.status,
      priority: fields.priority,
      storyPoints: fields.storyPoints,
      labels: fields.labels,
      dueDate: fields.dueDate || null,
      sprintId: fields.sprintId || null,
    };
    saveMutation.mutate(input);
  }

  return (
    <>
      <Dialog
        open
        onClose={requestClose}
        fullWidth
        maxWidth="md"
        aria-labelledby="todo-details-title"
        aria-busy={pending}
      >
        <DialogTitle id="todo-details-title">
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{todo.key}</Typography>
          Todo details
        </DialogTitle>
        <form onSubmit={handleSubmit} noValidate>
          <DialogContent dividers>
            <Stack spacing={2}>
              {serverError ? <Alert severity="error" role="alert">{serverError}</Alert> : null}
              {sprintsQuery.isError ? (
                <Alert severity="warning">Available sprints could not be loaded. Refresh before changing sprint assignment.</Alert>
              ) : null}
              <TextField
                label="Title"
                required
                autoFocus
                fullWidth
                value={fields.title}
                onChange={(event) => setField('title', event.target.value)}
                error={Boolean(errors.title)}
                helperText={errors.title || ' '}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={4}
                value={fields.description}
                onChange={(event) => setField('description', event.target.value)}
                error={Boolean(errors.description)}
                helperText={errors.description || `${fields.description.length}/5000 characters`}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="todo-type-label">Type</InputLabel>
                  <Select
                    labelId="todo-type-label"
                    label="Type"
                    value={fields.type}
                    onChange={(event) => setField('type', event.target.value as TodoType)}
                  >
                    {TODO_TYPES.map((type) => <MenuItem key={type} value={type}>{displayLabel(type)}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth error={Boolean(errors.status)}>
                  <InputLabel id="todo-status-label">Status</InputLabel>
                  <Select
                    labelId="todo-status-label"
                    label="Status"
                    value={fields.status}
                    onChange={(event) => setField('status', event.target.value as TodoStatus)}
                  >
                    {TODO_STATUSES.map((status) => <MenuItem key={status} value={status}>{displayLabel(status)}</MenuItem>)}
                  </Select>
                  {errors.status ? <Typography variant="caption" color="error">{errors.status}</Typography> : null}
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="todo-priority-label">Priority</InputLabel>
                  <Select
                    labelId="todo-priority-label"
                    label="Priority"
                    value={fields.priority}
                    onChange={(event) => setField('priority', event.target.value as TodoPriority)}
                  >
                    {TODO_PRIORITIES.map((priority) => <MenuItem key={priority} value={priority}>{displayLabel(priority)}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="todo-points-label">Story points</InputLabel>
                  <Select
                    labelId="todo-points-label"
                    label="Story points"
                    value={fields.storyPoints === null ? '' : String(fields.storyPoints)}
                    onChange={(event) => setField(
                      'storyPoints',
                      event.target.value === '' ? null : Number(event.target.value) as StoryPoints,
                    )}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {STORY_POINTS.map((points) => <MenuItem key={points} value={String(points)}>{points}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  label="Due date"
                  type="date"
                  fullWidth
                  value={fields.dueDate}
                  onChange={(event) => setField('dueDate', event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={Boolean(errors.dueDate)}
                  helperText={errors.dueDate || ' '}
                />
                <FormControl fullWidth error={Boolean(errors.sprintId)}>
                  <InputLabel id="todo-sprint-label">Sprint</InputLabel>
                  <Select
                    labelId="todo-sprint-label"
                    label="Sprint"
                    value={fields.sprintId}
                    disabled={sprintsQuery.isError}
                    onChange={(event) => setField('sprintId', event.target.value)}
                  >
                    <MenuItem value="">Backlog</MenuItem>
                    {sprints.filter((sprint) => sprint.status === 'planned' || sprint.status === 'active').map((sprint) => (
                      <MenuItem key={sprint.id} value={sprint.id}>
                        {sprint.name}{sprint.status === 'active' ? ' (Active)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.sprintId ? <Typography variant="caption" color="error">{errors.sprintId}</Typography> : null}
                </FormControl>
              </Stack>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    label="Add label"
                    size="small"
                    fullWidth
                    value={labelInput}
                    onChange={(event) => setLabelInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addLabel();
                      }
                    }}
                    error={Boolean(errors.labels)}
                    helperText={errors.labels || ' '}
                  />
                  <Button onClick={addLabel} disabled={!labelInput.trim()}>Add</Button>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {fields.labels.map((label) => (
                    <Chip key={label} label={label} onDelete={() => setField('labels', fields.labels.filter((item) => item !== label))} />
                  ))}
                </Stack>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
            <Button color="error" onClick={() => setDeleteOpen(true)} disabled={pending}>Delete Todo</Button>
            <Stack direction="row" spacing={1}>
              <Button onClick={requestClose} disabled={pending}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={pending}>
                {saveMutation.isPending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
                Save
              </Button>
            </Stack>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={discardOpen} onClose={() => setDiscardOpen(false)} aria-labelledby="discard-todo-title">
        <DialogTitle id="discard-todo-title">Discard changes?</DialogTitle>
        <DialogContent><Typography>Your unsaved changes will be lost.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardOpen(false)}>Keep editing</Button>
          <Button color="error" onClick={onClose}>Discard changes</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} aria-labelledby="delete-todo-title">
        <DialogTitle id="delete-todo-title">Delete Todo?</DialogTitle>
        <DialogContent>
          <Typography>Delete {todo.key} — {todo.title}? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
            Delete Todo
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
