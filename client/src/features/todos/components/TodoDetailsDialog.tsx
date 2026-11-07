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
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import { listSprints } from '../../sprints/api/sprints-api';
import { useFeedback } from '../../../app/providers/use-feedback';
import { getFieldErrors } from '../../../shared/api/errors';
import { PriorityBadge, TaskTypeBadge, TodoStatusBadge } from '../../../shared/components/ui';
import type { Sprint, StoryPoints, Todo, TodoPriority, TodoStatus, TodoType, UpdateTodoRequest } from '../../../shared/types/api';
import { STORY_POINTS, TODO_PRIORITIES, TODO_STATUSES, TODO_TYPES } from '../../../shared/types/api';
import { deleteTodo, updateTodo } from '../api/todos-api';
import { todosQueryKey } from '../hooks/use-backlog';
import { useLocale } from '../../../app/providers/use-locale';
import { chat } from '../../ai-assistant/api/ai-api';
import { useAiStatus } from '../../ai-assistant/hooks/use-ai-status';
import { AiModeBadge } from '../../ai-assistant/components/AiModeBadge';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePolishedTodo(content: string): { title: string; description: string } {
  const json = content.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error('The AI response could not be read. Please try again.');

  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('The AI response could not be read. Please try again.');
  }
  if (!isRecord(value) || typeof value.title !== 'string' || typeof value.description !== 'string') {
    throw new Error('The AI response did not include a valid title and description. Please try again.');
  }

  const title = value.title.trim();
  const description = value.description.trim();
  if (!title || title.length > 200 || description.length > 5000) {
    throw new Error('The AI response did not include a valid title and description. Please try again.');
  }
  return { title, description };
}

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
  const { t } = useLocale();
  const initialFields = getFields(todo);
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [labelInput, setLabelInput] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [polishedDraft, setPolishedDraft] = useState<{ title: string; description: string } | null>(null);
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const aiStatusQuery = useAiStatus();
  const sprintsQuery = useQuery({
    queryKey: ['sprints', projectId],
    queryFn: () => listSprints(projectId),
  });
  const sprints: Sprint[] = sprintsQuery.data?.sprints ?? [];

  const polishMutation = useMutation({
    mutationFn: async () => {
      const { message } = await chat(projectId, {
        messages: [{
          role: 'user',
          content: [
            'Polish this Todo for clarity. Do not invent requirements or change its intent.',
            'Return only valid JSON with exactly two string properties: {"title":"...","description":"..."}',
            'Keep the title concise. Make the description actionable and include acceptance criteria only when supported by the supplied details.',
            `Current title: ${fields.title}`,
            `Current description: ${fields.description || '(empty)'}`,
          ].join('\n\n'),
        }],
      });
      return parsePolishedTodo(message.content);
    },
    onSuccess: (draft) => {
      setPolishedDraft(draft);
      setServerError(null);
    },
    onError: (failure: unknown) => {
      setServerError(failure instanceof Error ? failure.message : t('Unable to polish this Todo.'));
    },
  });

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
      setServerError(Object.keys(fieldErrors).length ? null : error instanceof Error ? error.message : t('Unable to save this Todo.'));
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
      setServerError(error instanceof Error ? error.message : t('Unable to delete this Todo.'));
      setDeleteOpen(false);
    },
  });

  const dirty = !sameFields(initialFields, fields);
  const pending = saveMutation.isPending || deleteMutation.isPending || polishMutation.isPending;

  function setField<Key extends keyof TodoFields>(key: Key, value: TodoFields[Key]) {
    setFields((current) => ({ ...current, [key]: value }));
    setPolishedDraft(null);
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
      setErrors((current) => ({ ...current, labels: t('Each label must be 30 characters or fewer.') }));
      return;
    }
    if (fields.labels.length >= 10) {
      setErrors((current) => ({ ...current, labels: t('A Todo can have at most 10 labels.') }));
      return;
    }
    setField('labels', [...fields.labels, label]);
    setLabelInput('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const validation: Record<string, string> = {};
    if (!fields.title.trim()) validation.title = t('Title is required.');
    else if (fields.title.trim().length > 200) validation.title = t('Title must be 200 characters or fewer.');
    if (fields.description.length > 5000) validation.description = t('Description must be 5000 characters or fewer.');
    if (fields.labels.length > 10 || fields.labels.some((label) => label.length > 30)) {
      validation.labels = t('Use at most 10 labels, each 30 characters or fewer.');
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
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{todo.key}</Typography>
          <Typography component="span" variant="h3">{t('Todo details')}</Typography>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', mt: 1 }}>
            <TaskTypeBadge type={fields.type} />
            <TodoStatusBadge status={fields.status} />
            <PriorityBadge priority={fields.priority} />
          </Stack>
        </DialogTitle>
        <form onSubmit={handleSubmit} noValidate>
          <DialogContent dividers>
            <Stack spacing={2}>
              {serverError ? <Alert severity="error" role="alert">{serverError}</Alert> : null}
              {sprintsQuery.isLoading ? <Alert severity="info">{t('Loading available Sprints…')}</Alert> : null}
              {sprintsQuery.isError ? (
                <Alert
                  severity="warning"
                  role="alert"
                  action={<Button color="inherit" size="small" onClick={() => void sprintsQuery.refetch()}>{t('Retry')}</Button>}
                >
                  {t('Available sprints could not be loaded. Refresh before changing sprint assignment.')}
                </Alert>
              ) : null}
              <TextField
                label={t('Title')}
                required
                autoFocus
                fullWidth
                value={fields.title}
                onChange={(event) => setField('title', event.target.value)}
                error={Boolean(errors.title)}
                helperText={errors.title || ' '}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                <AiModeBadge />
                <Tooltip title={aiStatusQuery.data?.mode === 'mock'
                  ? t('Connect an AI model to polish this Todo.')
                  : aiStatusQuery.isError
                    ? t('AI availability could not be checked.')
                    : aiStatusQuery.isLoading
                      ? t('Checking AI availability…')
                      : t('Rewrite the title and description for clarity. You can review before applying.')}>
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={polishMutation.isPending ? <CircularProgress size={16} /> : <AutoAwesomeOutlined />}
                      disabled={aiStatusQuery.data?.mode !== 'ai' || polishMutation.isPending || pending}
                      onClick={() => {
                        setServerError(null);
                        polishMutation.mutate();
                      }}
                    >
                      {t('Polish with AI')}
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
              {aiStatusQuery.data?.mode === 'mock' ? (
                <Typography variant="caption" color="text.secondary">
                  {t('AI polishing requires a connected AI model.')}
                </Typography>
              ) : null}
              {polishMutation.isPending ? (
                <Typography role="status" aria-live="polite">{t('Polishing this Todo…')}</Typography>
              ) : null}
              {polishedDraft ? (
                <Alert
                  severity="info"
                  action={(
                    <Button
                      color="inherit"
                      size="small"
                      onClick={() => {
                        setField('title', polishedDraft.title);
                        setField('description', polishedDraft.description);
                        setPolishedDraft(null);
                      }}
                    >
                      {t('Apply')}
                    </Button>
                  )}
                >
                  <Typography variant="subtitle2">{t('Review AI suggestion')}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>{polishedDraft.title}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{polishedDraft.description}</Typography>
                </Alert>
              ) : null}
              <TextField
                label={t('Description')}
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
                  <InputLabel id="todo-type-label">{t('Type')}</InputLabel>
                  <Select
                    labelId="todo-type-label"
                    label={t('Type')}
                    value={fields.type}
                    onChange={(event) => setField('type', event.target.value as TodoType)}
                  >
                    {TODO_TYPES.map((type) => <MenuItem key={type} value={type}>{t(displayLabel(type))}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth error={Boolean(errors.status)}>
                  <InputLabel id="todo-status-label">{t('Status')}</InputLabel>
                  <Select
                    labelId="todo-status-label"
                    label={t('Status')}
                    value={fields.status}
                    onChange={(event) => setField('status', event.target.value as TodoStatus)}
                  >
                    {TODO_STATUSES.map((status) => <MenuItem key={status} value={status}>{t(displayLabel(status))}</MenuItem>)}
                  </Select>
                  {errors.status ? <Typography variant="caption" color="error">{errors.status}</Typography> : null}
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="todo-priority-label">{t('Priority')}</InputLabel>
                  <Select
                    labelId="todo-priority-label"
                    label={t('Priority')}
                    value={fields.priority}
                    onChange={(event) => setField('priority', event.target.value as TodoPriority)}
                  >
                    {TODO_PRIORITIES.map((priority) => <MenuItem key={priority} value={priority}>{t(displayLabel(priority))}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel id="todo-points-label">{t('Story points')}</InputLabel>
                  <Select
                    labelId="todo-points-label"
                    label={t('Story points')}
                    value={fields.storyPoints === null ? '' : String(fields.storyPoints)}
                    onChange={(event) => setField(
                      'storyPoints',
                      event.target.value === '' ? null : Number(event.target.value) as StoryPoints,
                    )}
                  >
                    <MenuItem value=""><em>{t('None')}</em></MenuItem>
                    {STORY_POINTS.map((points) => <MenuItem key={points} value={String(points)}>{points}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  label={t('Due date')}
                  type="date"
                  fullWidth
                  value={fields.dueDate}
                  onChange={(event) => setField('dueDate', event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={Boolean(errors.dueDate)}
                  helperText={errors.dueDate || ' '}
                />
                <FormControl fullWidth error={Boolean(errors.sprintId)}>
                  <InputLabel id="todo-sprint-label">{t('Sprint')}</InputLabel>
                  <Select
                    labelId="todo-sprint-label"
                    label={t('Sprint')}
                    value={fields.sprintId}
                    disabled={sprintsQuery.isError || sprintsQuery.isLoading}
                    onChange={(event) => setField('sprintId', event.target.value)}
                  >
                    <MenuItem value="">{t('Backlog')}</MenuItem>
                    {sprints.filter((sprint) => sprint.status === 'planned' || sprint.status === 'active').map((sprint) => (
                      <MenuItem key={sprint.id} value={sprint.id}>
                        {sprint.name}{sprint.status === 'active' ? ` (${t('Active')})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.sprintId ? <Typography variant="caption" color="error">{errors.sprintId}</Typography> : null}
                </FormControl>
              </Stack>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1}>
                  <TextField
                    label={t('Add label')}
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
                  <Button onClick={addLabel} disabled={!labelInput.trim()}>{t('Add')}</Button>
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
            <Button color="error" onClick={() => setDeleteOpen(true)} disabled={pending}>{t('Delete Todo')}</Button>
            <Stack direction="row" spacing={1}>
              <Button onClick={requestClose} disabled={pending}>{t('Cancel')}</Button>
              <Button type="submit" variant="contained" disabled={pending}>
                {saveMutation.isPending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
                {t('Save')}
              </Button>
            </Stack>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={discardOpen} onClose={() => setDiscardOpen(false)} aria-labelledby="discard-todo-title">
        <DialogTitle id="discard-todo-title">{t('Discard changes?')}</DialogTitle>
        <DialogContent><Typography>{t('Your unsaved changes will be lost.')}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDiscardOpen(false)}>{t('Keep editing')}</Button>
          <Button color="error" onClick={onClose}>{t('Discard changes')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} aria-labelledby="delete-todo-title">
        <DialogTitle id="delete-todo-title">{t('Delete Todo?')}</DialogTitle>
        <DialogContent>
          <Typography>{t('Delete')} {todo.key} — {todo.title}? {t('This cannot be undone.')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleteMutation.isPending}>{t('Cancel')}</Button>
          <Button color="error" variant="contained" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
            {t('Delete Todo')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
