import { useMemo, useState, type FormEvent } from 'react';
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
import type { Todo } from '../../../shared/types/api';
import { createSprint } from '../../sprints/api/sprints-api';
import { sprintsQueryKey } from '../../sprints/hooks/use-sprints';
import { todosQueryKey, useBacklog } from '../../todos/hooks/use-backlog';
import { planSprint } from '../api/ai-api';

const EMPTY_TODOS: Todo[] = [];

export function AiSprintPlanningDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [capacity, setCapacity] = useState(30);
  const [focus, setFocus] = useState('');
  const [goal, setGoal] = useState('');
  const [suggestedIds, setSuggestedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const backlogQuery = useBacklog(projectId);
  const backlog = backlogQuery.data?.todos ?? EMPTY_TODOS;
  const todosById = useMemo(() => new Map(backlog.map((todo) => [todo.id, todo])), [backlog]);
  const selectedTodos = selectedIds.map((id) => todosById.get(id)).filter((todo): todo is Todo => Boolean(todo));
  const selectedPoints = selectedTodos.reduce((sum, todo) => sum + (todo.storyPoints ?? 0), 0);

  const planMutation = useMutation({
    mutationFn: () => planSprint(projectId, { capacity, focus: focus.trim() || undefined }),
    onSuccess: (plan) => {
      const availableIds = plan.todoIds.filter((id) => todosById.has(id));
      setGoal(plan.goal);
      setReasoning(plan.reasoning);
      setSuggestedIds(availableIds);
      setSelectedIds(availableIds);
      setError('');
    },
    onError: (failure: unknown) => setError(failure instanceof ApiError && failure.status === 429
      ? 'Too many requests. Please wait a moment.'
      : failure instanceof Error ? failure.message : 'Unable to suggest a Sprint plan.'),
  });

  const createMutation = useMutation({
    mutationFn: () => createSprint(projectId, { goal: goal.trim(), todoIds: selectedIds }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sprintsQueryKey(projectId) }),
        queryClient.invalidateQueries({ queryKey: todosQueryKey(projectId) }),
      ]);
      notify('Planned Sprint created.');
      onClose();
    },
    onError: (failure: unknown) => setError(failure instanceof Error ? failure.message : 'Unable to create the Sprint.'),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (planMutation.isPending || !Number.isInteger(capacity) || capacity < 1 || capacity > 200) return;
    setError('');
    planMutation.mutate();
  }

  const canCreate = suggestedIds.length > 0 && selectedIds.length > 0 && selectedPoints <= capacity && goal.trim().length > 0 && !createMutation.isPending;

  return (
    <Dialog open onClose={planMutation.isPending || createMutation.isPending ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Plan a Sprint with AI</DialogTitle>
      <form onSubmit={submit}>
        <DialogContent dividers>
          <Stack spacing={2}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {backlogQuery.isError ? <Alert severity="error">Unable to load backlog Todos for planning.</Alert> : null}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label="Capacity (story points)"
                type="number"
                required
                value={capacity}
                onChange={(event) => setCapacity(Number(event.target.value))}
                slotProps={{ htmlInput: { min: 1, max: 200 } }}
                error={!Number.isInteger(capacity) || capacity < 1 || capacity > 200}
                helperText="Enter 1–200 points."
              />
              <TextField label="Focus or objective (optional)" fullWidth value={focus} onChange={(event) => setFocus(event.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }} />
            </Stack>
            <Button type="submit" variant="outlined" disabled={planMutation.isPending || backlogQuery.isLoading || !Number.isInteger(capacity) || capacity < 1 || capacity > 200}>
              {planMutation.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              Suggest plan
            </Button>
            {planMutation.error instanceof ApiError && planMutation.error.status === 502 ? (
              <Button onClick={() => planMutation.mutate()} disabled={planMutation.isPending}>Retry</Button>
            ) : null}
            {suggestedIds.length > 0 ? (
              <>
                <TextField label="Suggested Sprint goal" required value={goal} onChange={(event) => setGoal(event.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }} />
                <Typography variant="body2" color={selectedPoints > capacity ? 'error.main' : 'text.secondary'}>
                  Selected: {selectedPoints} / {capacity} story points
                </Typography>
                <Stack spacing={0.75}>
                  {suggestedIds.map((id) => {
                    const todo = todosById.get(id);
                    if (!todo) return null;
                    return (
                      <FormControlLabel
                        key={id}
                        control={<Checkbox checked={selectedIds.includes(id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, id] : current.filter((value) => value !== id))} />}
                        label={`${todo.key} · ${todo.title} · ${todo.storyPoints ?? 0} pts`}
                      />
                    );
                  })}
                </Stack>
                <Alert severity="info">{reasoning}</Alert>
              </>
            ) : null}
            <Typography variant="caption" color="text.secondary">AI can make mistakes. Review before saving.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={planMutation.isPending || createMutation.isPending}>Cancel</Button>
          {suggestedIds.length > 0 ? (
            <Button type="button" variant="contained" disabled={!canCreate} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
              Create Sprint
            </Button>
          ) : null}
        </DialogActions>
      </form>
    </Dialog>
  );
}
