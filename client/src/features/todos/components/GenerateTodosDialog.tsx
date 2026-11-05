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
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useFeedback } from '../../../app/providers/use-feedback';
import { ApiError } from '../../../shared/api/errors';
import { generateTodos } from '../../ai-assistant/api/ai-api';
import { createTodosBulk } from '../api/todos-api';
import { todosQueryKey } from '../hooks/use-backlog';
import type { DraftTodo } from '../../../shared/types/api';

export function GenerateTodosDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(5);
  const [drafts, setDrafts] = useState<DraftTodo[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { notify } = useFeedback();

  const generateMutation = useMutation({
    mutationFn: () => generateTodos(projectId, { prompt: prompt.trim(), count }),
    onSuccess: ({ todos }) => {
      setDrafts(todos);
      setSelected(todos.map(() => true));
      setError(null);
    },
    onError: (failure: unknown) => {
      setError(failure instanceof ApiError ? failure.message : 'Unable to generate Todos. Please try again.');
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
      setError(failure instanceof ApiError ? failure.message : 'Unable to save the generated Todos.');
    },
  });

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (generateMutation.isPending || prompt.trim().length < 3) {
      if (prompt.trim().length < 3) setError('Describe what the Todos should cover (at least 3 characters).');
      return;
    }
    setError(null);
    generateMutation.mutate();
  }

  const selectedCount = selected.filter(Boolean).length;
  const canSave = drafts.length > 0 && selectedCount > 0 && !saveMutation.isPending;

  return (
    <Dialog open onClose={generateMutation.isPending || saveMutation.isPending ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Generate Todos with AI</DialogTitle>
      <form onSubmit={handleGenerate}>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
            <TextField
              label="What should these Todos cover?"
              fullWidth
              multiline
              minRows={2}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              helperText="Describe the feature or work area."
            />
            <TextField
              label="Number of Todos"
              type="number"
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
              slotProps={{ htmlInput: { min: 1, max: 10 } }}
              sx={{ width: 180 }}
            />
            <Button type="submit" variant="outlined" disabled={generateMutation.isPending}>
              {generateMutation.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Generate suggestions
            </Button>
            {drafts.length ? (
              <Stack spacing={1}>
                <Typography variant="h3">Review suggestions</Typography>
                {drafts.map((draft, index) => (
                  <Stack key={`${draft.title}-${index}`} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <FormControlLabel
                      control={(
                        <Checkbox
                          checked={selected[index] ?? false}
                          onChange={(event) => setSelected((current) => current.map((value, itemIndex) => (
                            itemIndex === index ? event.target.checked : value
                          )))}
                        />
                      )}
                      label={(
                        <Stack>
                          <Typography sx={{ fontWeight: 600 }}>{draft.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {draft.type} · {draft.priority} · {draft.storyPoints ?? 'No'} points
                          </Typography>
                          {draft.description ? <Typography variant="body2">{draft.description}</Typography> : null}
                        </Stack>
                      )}
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                  </Stack>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={generateMutation.isPending || saveMutation.isPending}>Cancel</Button>
          {drafts.length ? (
            <Button type="button" variant="contained" disabled={!canSave} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
              Add {selectedCount} to backlog
            </Button>
          ) : null}
        </DialogActions>
      </form>
    </Dialog>
  );
}
