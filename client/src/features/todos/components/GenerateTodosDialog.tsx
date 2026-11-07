import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useFeedback } from '../../../app/providers/use-feedback';
import { ApiError } from '../../../shared/api/errors';
import { generateTodos } from '../../ai-assistant/api/ai-api';
import { createTodosBulk } from '../api/todos-api';
import { todosQueryKey } from '../hooks/use-backlog';
import { STORY_POINTS, TODO_PRIORITIES, TODO_TYPES, type DraftTodo, type StoryPoints, type TodoPriority, type TodoType } from '../../../shared/types/api';
import { useLocale } from '../../../app/providers/use-locale';

export function GenerateTodosDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { t } = useLocale();
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(5);
  const [drafts, setDrafts] = useState<DraftTodo[]>([]);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { notify } = useFeedback();

  const generateMutation = useMutation({
    mutationFn: () => generateTodos(projectId, { prompt: prompt.trim(), count }),
    onSuccess: ({ todos }) => {
      setDrafts(todos.map((todo) => ({ ...todo })));
      setDraftIds(todos.map(() => crypto.randomUUID()));
      setSelected(todos.map(() => true));
      setError(null);
    },
    onError: (failure: unknown) => {
      setError(failure instanceof ApiError && failure.status === 429
        ? 'Too many requests. Please wait a moment.'
        : failure instanceof Error ? failure.message : t('Unable to generate Todos. Please try again.'));
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => createTodosBulk(projectId, {
      todos: drafts.filter((_todo, index) => selected[index]).map((todo) => ({
        ...todo,
        labels: [],
        dueDate: null,
        sprintId: null,
      })),
    }),
    onSuccess: async ({ todos }) => {
      await queryClient.invalidateQueries({ queryKey: todosQueryKey(projectId) });
      notify(`${todos.length} Todo${todos.length === 1 ? '' : 's'} added to the backlog.`);
      onClose();
    },
    onError: (failure: unknown) => {
      setError(failure instanceof ApiError && failure.status === 429
        ? 'Too many requests. Please wait a moment.'
        : failure instanceof Error ? failure.message : t('Unable to save the generated Todos.'));
    },
  });

  function generateSuggestions() {
    if (generateMutation.isPending || prompt.trim().length < 3) {
      if (prompt.trim().length < 3) setError(t('Describe what the Todos should cover (at least 3 characters).'));
      return;
    }
    if (drafts.length && !window.confirm(t('Generate new suggestions and replace your current review?'))) return;
    setError(null);
    generateMutation.mutate();
  }

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    generateSuggestions();
  }

  const selectedCount = selected.filter(Boolean).length;
  const canSave = drafts.length > 0 && selectedCount > 0 && !saveMutation.isPending;

  function updateDraft(index: number, patch: Partial<DraftTodo>) {
    setDrafts((current) => current.map((draft, draftIndex) => (
      draftIndex === index ? { ...draft, ...patch } : draft
    )));
  }

  return (
    <Dialog open onClose={generateMutation.isPending || saveMutation.isPending ? undefined : onClose} fullWidth maxWidth="md" aria-labelledby="generate-todos-dialog-title">
      <DialogTitle id="generate-todos-dialog-title">{t('Generate Todos with AI')}</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={2}>
        {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
        <form onSubmit={handleGenerate}>
          <Stack spacing={2}>
          <TextField
            label={t('What should these Todos cover?')}
              fullWidth
              multiline
              minRows={2}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              required
              autoFocus
              slotProps={{ htmlInput: { minLength: 3, maxLength: 2000 } }}
              helperText={t('Describe the feature or work area.')}
            />
            <TextField
              label={t('Number of Todos')}
              type="number"
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              slotProps={{ htmlInput: { min: 1, max: 10 } }}
              sx={{ width: 180 }}
              error={!Number.isInteger(count) || count < 1 || count > 10}
              helperText={t('Choose 1–10 suggestions.')}
            />
            <Button type="submit" variant="outlined" disabled={generateMutation.isPending || prompt.trim().length < 3 || !Number.isInteger(count) || count < 1 || count > 10}>
              {generateMutation.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              {t('Generate suggestions')}
            </Button>
            </Stack>
          </form>
          {drafts.length ? (
            <Stack spacing={1}>
              <Typography variant="h3">{t('Review suggestions')}</Typography>
              {drafts.map((draft, index) => (
                  <Stack key={draftIds[index]} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'flex-start', border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                    <FormControlLabel
                      control={(
                        <Checkbox
                          checked={selected[index] ?? false}
                          onChange={(event) => setSelected((current) => current.map((value, itemIndex) => (
                            itemIndex === index ? event.target.checked : value
                          )))}
                        />
                      )}
                      label={`${t('Include suggestion')} ${index + 1}`}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                    <Stack spacing={1} sx={{ flex: 1, width: { xs: '100%', sm: 'auto' }, minWidth: 0 }}>
                      <TextField label={t('Title')} value={draft.title} onChange={(event) => updateDraft(index, { title: event.target.value })} size="small" fullWidth />
                      <TextField label={t('Description')} value={draft.description} onChange={(event) => updateDraft(index, { description: event.target.value })} size="small" fullWidth multiline minRows={2} />
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <TextField select label={t('Type')} value={draft.type} onChange={(event) => updateDraft(index, { type: event.target.value as TodoType })} size="small" fullWidth>
                          {TODO_TYPES.map((type) => <MenuItem key={type} value={type}>{t(type)}</MenuItem>)}
                        </TextField>
                        <TextField select label={t('Priority')} value={draft.priority} onChange={(event) => updateDraft(index, { priority: event.target.value as TodoPriority })} size="small" fullWidth>
                          {TODO_PRIORITIES.map((priority) => <MenuItem key={priority} value={priority}>{t(priority)}</MenuItem>)}
                        </TextField>
                        <TextField select label={t('Story points')} value={draft.storyPoints ?? ''} onChange={(event) => updateDraft(index, { storyPoints: event.target.value ? Number(event.target.value) as StoryPoints : null })} size="small" fullWidth>
                          <MenuItem value="">{t('None')}</MenuItem>
                          {STORY_POINTS.map((points) => <MenuItem key={points} value={points}>{points}</MenuItem>)}
                        </TextField>
                      </Stack>
                    </Stack>
                  </Stack>
              ))}
            </Stack>
          ) : null}
          <Typography variant="caption" color="text.secondary">
            {t('AI can make mistakes. Review before saving.')}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={generateMutation.isPending || saveMutation.isPending}>{t('Cancel')}</Button>
        {drafts.length ? (
          <Button type="button" variant="contained" disabled={!canSave} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
            {t('Add')} {selectedCount} {t('to backlog')}
          </Button>
        ) : null}
        {generateMutation.error instanceof ApiError && (generateMutation.error.status === 429 || generateMutation.error.status === 502) ? (
          <Button onClick={generateSuggestions} disabled={generateMutation.isPending}>{t('Retry')}</Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
