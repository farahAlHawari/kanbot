import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import ReactMarkdown from 'react-markdown';
import { useFeedback } from '../../../app/providers/use-feedback';
import { ApiError } from '../../../shared/api/errors';
import type { Sprint } from '../../../shared/types/api';
import { sprintsQueryKey } from '../../sprints/hooks/use-sprints';
import { summarizeSprint } from '../api/ai-api';
import { useLocale } from '../../../app/providers/use-locale';

export function SprintSummaryPanel({
  sprint,
  projectId,
}: {
  sprint: Sprint;
  projectId: string;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const mutation = useMutation({
    mutationFn: () => summarizeSprint(sprint.id),
    onSuccess: async ({ sprint: updatedSprint }) => {
      queryClient.setQueryData(['sprint', sprint.id], { sprint: updatedSprint });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sprint', sprint.id] }),
        queryClient.invalidateQueries({ queryKey: sprintsQueryKey(projectId) }),
        queryClient.invalidateQueries({ queryKey: ['sprint-board'] }),
      ]);
      notify('Sprint summary saved.');
    },
  });

  const errorMessage = mutation.error instanceof ApiError && mutation.error.status === 429
    ? 'Too many requests. Please wait a moment.'
    : mutation.error instanceof Error
      ? mutation.error.message
      : 'Unable to generate the Sprint summary.';

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1 }}>
            <Typography component="h2" variant="h3">{t('AI Sprint summary')}</Typography>
            {sprint.status !== 'planned' ? (
              <Button variant="ai" startIcon={<AutoAwesomeOutlined />} onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                {t(sprint.summary ? 'Regenerate' : 'Generate Summary')}
              </Button>
            ) : null}
          </Stack>
          {mutation.isError ? (
            <Alert severity="error" action={mutation.error instanceof ApiError && (mutation.error.status === 429 || mutation.error.status === 502) ? (
              <Button color="inherit" size="small" onClick={() => mutation.mutate()} disabled={mutation.isPending}>Retry</Button>
            ) : undefined}>
              {errorMessage}
            </Alert>
          ) : null}
          {mutation.isPending && !sprint.summary ? <Typography color="text.secondary">{t('Thinking…')}</Typography> : null}
          {sprint.summary ? (
            <>
              <ReactMarkdown>{sprint.summary.content}</ReactMarkdown>
              <Typography variant="caption" color="text.secondary">
                {t('Generated')} {new Date(sprint.summary.generatedAt).toLocaleString('en')} · {sprint.summary.source}
              </Typography>
            </>
          ) : !mutation.isPending ? (
            <Typography color="text.secondary">{t('No summary has been generated yet.')}</Typography>
          ) : null}
          <Typography variant="caption" color="text.secondary">{t('AI can make mistakes. Review before sharing.')}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
