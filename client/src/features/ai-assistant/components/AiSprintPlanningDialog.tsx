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
import { AiModeBadge } from './AiModeBadge';
import { useLocale } from '../../../app/providers/use-locale';

const EMPTY_TODOS: Todo[] = [];

export function AiSprintPlanningDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { t } = useLocale();
  const [capacity, setCapacity] = useState(30);
  const [focus, setFocus] = useState('');
  const [goal, setGoal] = useState('');
  const [hasPlan, setHasPlan] = useState(false);
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
      setHasPlan(true);
      setGoal(plan.goal);
      setReasoning(plan.reasoning);
      setSuggestedIds(availableIds);
      setSelectedIds(availableIds);
      setError(plan.todoIds.length > 0 && availableIds.length === 0
        ? t('The suggested Todos are no longer in the backlog. Please try again.')
        : '');
    },
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
    onError: (failure: unknown) => setError(failure instanceof Error ? failure.message : t('Unable to create the Sprint.')),
  });

  function requestPlan() {
    if (planMutation.isPending || !Number.isInteger(capacity) || capacity < 1 || capacity > 200) return;
    setError('');
    setHasPlan(false);
    setSuggestedIds([]);
    setSelectedIds([]);
    setGoal('');
    setReasoning('');
    planMutation.reset();
    createMutation.reset();
    planMutation.mutate();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestPlan();
  }

  const canCreate = suggestedIds.length > 0 && selectedIds.length > 0 && selectedPoints <= capacity && goal.trim().length > 0 && !createMutation.isPending;

  return (
    <Dialog open onClose={planMutation.isPending || createMutation.isPending ? undefined : onClose} fullWidth maxWidth="md" aria-labelledby="plan-sprint-dialog-title">
      <DialogTitle id="plan-sprint-dialog-title">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          {t('Plan a Sprint with AI')}
          <AiModeBadge />
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
          <Stack spacing={2}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {planMutation.isPending ? <Typography role="status" aria-live="polite">{t('Planning your Sprint…')}</Typography> : null}
            {backlogQuery.isLoading ? (
              <Alert severity="info" icon={<CircularProgress size={18} />}>{t('Loading backlog for Sprint planning…')}</Alert>
            ) : null}
            {backlogQuery.isError ? (
              <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void backlogQuery.refetch()}>{t('Retry')}</Button>}>
                {t('Unable to load backlog Todos for planning.')}
              </Alert>
            ) : null}
            {!backlogQuery.isLoading && !backlogQuery.isError && backlog.length === 0 ? (
              <Alert severity="info">{t('Your backlog is empty. Add Todos first.')}</Alert>
            ) : null}
            <form onSubmit={submit}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                label={t('Capacity (story points)')}
                type="number"
                required
                autoFocus
                value={capacity}
                onChange={(event) => setCapacity(Number(event.target.value))}
                slotProps={{ htmlInput: { min: 1, max: 200 } }}
                error={!Number.isInteger(capacity) || capacity < 1 || capacity > 200}
                helperText={t('Enter 1–200 points.')}
              />
              <TextField label={t('Focus or objective (optional)')} fullWidth value={focus} onChange={(event) => setFocus(event.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }} />
            </Stack>
            <Button type="submit" variant="outlined" disabled={planMutation.isPending || backlogQuery.isLoading || backlog.length === 0 || !Number.isInteger(capacity) || capacity < 1 || capacity > 200}>
              {planMutation.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              {t('Suggest plan')}
            </Button>
            </form>
            {planMutation.isError ? (
              <Alert severity="error" role="alert" action={
                <Button color="inherit" size="small" onClick={requestPlan} disabled={planMutation.isPending}>
                  {t('Retry')}
                </Button>
              }>
                {planMutation.error instanceof ApiError && planMutation.error.status === 429
                  ? t('Too many requests. Please wait a moment.')
                  : planMutation.error instanceof Error
                    ? planMutation.error.message
                    : t('Unable to suggest a Sprint plan.')}
              </Alert>
            ) : null}
            {hasPlan ? (
              <>
                <TextField label={t('Suggested Sprint goal')} required value={goal} onChange={(event) => setGoal(event.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }} />
                <Typography variant="body2" color={selectedPoints > capacity ? 'error.main' : 'text.secondary'}>
                  {t('Selected')}: {selectedPoints} / {capacity} {t('story points')}
                </Typography>
                {suggestedIds.length ? (
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
                ) : error ? null : (
                  <Alert severity="info">
                    {t('No backlog Todos fit this capacity. Increase the capacity or add story-point estimates, then suggest a plan again.')}
                  </Alert>
                )}
                <Alert severity="info">{reasoning}</Alert>
              </>
            ) : null}
            <Typography variant="caption" color="text.secondary">{t('AI can make mistakes. Review before saving.')}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={planMutation.isPending || createMutation.isPending}>{t('Cancel')}</Button>
          {suggestedIds.length > 0 ? (
            <Button type="button" variant="contained" disabled={!canCreate} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} /> : null}
              {t('Create Sprint')}
            </Button>
          ) : null}
        </DialogActions>
    </Dialog>
  );
}
