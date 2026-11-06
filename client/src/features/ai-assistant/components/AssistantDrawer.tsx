import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import ReactMarkdown from 'react-markdown';
import { ApiError } from '../../../shared/api/errors';
import type { ChatMessage, SprintSummary } from '../../../shared/types/api';
import { useFeedback } from '../../../app/providers/use-feedback';
import { sprintsQueryKey, useSprints } from '../../sprints/hooks/use-sprints';
import { summarizeSprint } from '../api/ai-api';
import { chat, getAiStatus } from '../api/ai-api';
import { AiSprintPlanningDialog } from './AiSprintPlanningDialog';
import { GenerateTodosDialog } from '../../todos/components/GenerateTodosDialog';
import kanbotIcon from '../../../assets/brand/kanbot-icon.svg';
import { useLocale } from '../../../app/providers/use-locale';

function visibleAiError(error: unknown) {
  if (error instanceof ApiError && error.status === 429) return 'Too many requests. Please wait a moment.';
  if (error instanceof Error) return error.message;
  return 'The AI request failed. Please try again.';
}

export function AssistantDrawer({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId?: string;
}) {
  const { t } = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [summary, setSummary] = useState<SprintSummary | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const statusQuery = useQuery({
    queryKey: ['ai-status'],
    queryFn: getAiStatus,
    staleTime: 5 * 60_000,
  });
  const sprintsQuery = useSprints(projectId ?? '');
  const sprints = sprintsQuery.data?.sprints ?? [];
  const summarySprint = sprints.find((sprint) => sprint.status === 'active')
    ?? sprints.find((sprint) => sprint.status === 'completed');

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const chatMutation = useMutation({
    mutationFn: ({ targetProjectId, conversation }: { targetProjectId: string; conversation: ChatMessage[] }) =>
      chat(targetProjectId, { messages: conversation }),
    onSuccess: ({ message }, variables) => {
      if (variables.targetProjectId === projectId) setMessages((current) => [...current, message]);
    },
  });

  const summaryMutation = useMutation({
    mutationFn: ({ targetProjectId, sprintId }: { targetProjectId: string; sprintId: string }) =>
      summarizeSprint(sprintId).then((response) => ({ ...response, targetProjectId })),
    onSuccess: async ({ summary: generatedSummary, sprint, targetProjectId }) => {
      if (targetProjectId !== projectId) return;
      setSummary(generatedSummary);
      queryClient.setQueryData(['sprint', sprint.id], { sprint });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sprint', sprint.id] }),
        queryClient.invalidateQueries({ queryKey: sprintsQueryKey(targetProjectId) }),
        queryClient.invalidateQueries({ queryKey: ['sprint-board'] }),
      ]);
      notify(`${sprint.name} summary generated.`);
    },
  });

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!projectId || !content || chatMutation.isPending || content.length > 4000) return;
    const userMessage: ChatMessage = { role: 'user', content };
    const conversation: ChatMessage[] = [...messages, userMessage].slice(-30);
    setMessages(conversation);
    setInput('');
    chatMutation.mutate({ targetProjectId: projectId, conversation });
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.closest('form')?.requestSubmit();
    }
  }

  function createNewChat() {
    setMessages([]);
    setInput('');
    chatMutation.reset();
  }

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100%', height: '100dvh', minHeight: 0, display: 'flex' } } }}
      >
        <Stack sx={{ height: '100%', minHeight: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box component="img" src={kanbotIcon} alt="" aria-hidden="true" sx={{ width: 32, height: 32, flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="h2" variant="h3">{t('Kanbot Assistant')}</Typography>
              {statusQuery.data?.mode === 'ai' && statusQuery.data.model ? (
                <Typography variant="caption" color="text.secondary">{statusQuery.data.model}</Typography>
              ) : null}
            </Box>
            {statusQuery.data?.mode === 'mock' ? <Chip size="small" label={t('Mock AI')} sx={{ bgcolor: 'var(--primary-soft)', color: 'var(--primary-soft-text)', border: '1px solid var(--mui-palette-brand-200)' }} /> : null}
            <Tooltip title={t('New chat')}>
              <IconButton aria-label={t('New chat')} onClick={createNewChat} disabled={chatMutation.isPending}><span aria-hidden="true">＋</span></IconButton>
            </Tooltip>
            <IconButton aria-label={t('Close assistant')} onClick={onClose}><CloseOutlined /></IconButton>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', flexWrap: 'nowrap', overflowX: 'auto' }}>
            <Button size="small" variant="ai" startIcon={<AutoAwesomeOutlined />} disabled={!projectId} onClick={() => setGenerateOpen(true)}>{t('Create todos')}</Button>
            <Button size="small" variant="ai" startIcon={<AutoAwesomeOutlined />} disabled={!projectId} onClick={() => setPlanOpen(true)}>{t('Plan sprint')}</Button>
            <Button size="small" variant="ai" startIcon={<AutoAwesomeOutlined />} disabled={!summarySprint || summaryMutation.isPending} onClick={() => summarySprint && projectId && summaryMutation.mutate({ targetProjectId: projectId, sprintId: summarySprint.id })}>
              {t('Summarize sprint')}
            </Button>
          </Stack>

          <Box ref={listRef} role="log" aria-label={t('Assistant conversation')} aria-live="polite" sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
            {statusQuery.isError ? <Alert severity="warning" sx={{ mb: 1 }}>{t('AI status is unavailable. You can still try a request.')}</Alert> : null}
            {!projectId ? <Alert severity="info" sx={{ mb: 1 }}>{t('Select a project to chat with the assistant.')}</Alert> : null}
            {messages.length > 0 ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>{t('Today')}</Typography> : null}
            {messages.map((message, index) => (
              <Stack key={`${index}-${message.role}`} direction={message.role === 'user' ? 'row-reverse' : 'row'} spacing={1} sx={{ alignItems: 'flex-start', mb: 1.5 }}>
                {message.role === 'assistant' ? <Box component="img" src={kanbotIcon} alt="" aria-hidden="true" sx={{ width: 28, height: 28, mt: 0.5 }} /> : null}
                <Paper variant="outlined" sx={{
                  maxWidth: '85%',
                  p: 1.5,
                  bgcolor: message.role === 'user' ? 'primary.main' : 'background.subtle',
                  color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  borderRadius: message.role === 'user' ? '12px 12px 4px 12px' : '4px 12px 12px 12px',
                  overflowWrap: 'anywhere',
                  '& p:first-of-type': { mt: 0.5 },
                  '& p:last-child': { mb: 0 },
                  '& h1, & h2, & h3, & h4': { fontSize: '0.875rem', lineHeight: '22px', fontWeight: 600, mt: 1.5, mb: 0.5 },
                  '& h1:first-child, & h2:first-child, & h3:first-child, & h4:first-child': { mt: 0.5 },
                  '& ul, & ol': { pl: 2.5, my: 0.75 },
                  '& li + li': { mt: 0.5 },
                  '& pre': { maxWidth: '100%', overflowX: 'auto', p: 1, bgcolor: 'background.muted', borderRadius: 1 },
                  '& code': { fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace' },
                  '& a': { color: 'primary.light' },
                  '& table': { display: 'block', maxWidth: '100%', overflowX: 'auto', borderCollapse: 'collapse' },
                  '& th, & td': { border: 1, borderColor: 'divider', p: 0.5 },
                }}>
                  <Typography variant="caption" color={message.role === 'user' ? 'inherit' : 'text.secondary'}>{message.role === 'user' ? t('You') : 'Kanbot AI'}</Typography>
                  <Box><ReactMarkdown>{message.content}</ReactMarkdown></Box>
                </Paper>
              </Stack>
            ))}
            {chatMutation.isPending ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary', mb: 1.5 }}>
                <CircularProgress size={16} /><Typography>{t('Thinking...')}</Typography>
              </Stack>
            ) : null}
            {chatMutation.isError ? (
              <Alert severity="error" sx={{ mb: 1 }} action={
                chatMutation.error instanceof ApiError && (chatMutation.error.status === 429 || chatMutation.error.status === 502) ? (
                  <Button color="inherit" size="small" onClick={() => chatMutation.variables && chatMutation.mutate(chatMutation.variables)}>{t('Retry')}</Button>
                ) : undefined
              }>
                {visibleAiError(chatMutation.error)}
              </Alert>
            ) : null}
            {summaryMutation.isError ? (
              <Alert severity="error" sx={{ mb: 1 }} action={
                summaryMutation.error instanceof ApiError && (summaryMutation.error.status === 429 || summaryMutation.error.status === 502) ? (
                  <Button color="inherit" size="small" onClick={() => summaryMutation.variables && summaryMutation.mutate(summaryMutation.variables)}>{t('Retry')}</Button>
                ) : undefined
              }>
                {visibleAiError(summaryMutation.error)}
              </Alert>
            ) : null}
            {summary ? (
              <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                <Typography variant="subtitle2">{t('Sprint summary')}</Typography>
                <ReactMarkdown>{summary.content}</ReactMarkdown>
                <Typography variant="caption" color="text.secondary">{t('Generated')} {new Date(summary.generatedAt).toLocaleString('en')} · {summary.source}</Typography>
              </Paper>
            ) : null}
          </Box>

          <Box component="form" onSubmit={sendMessage} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
              <TextField
                label={t('Message')}
                placeholder={t('Ask about this project...')}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onInputKeyDown}
                multiline
                minRows={2}
                maxRows={6}
                fullWidth
                disabled={!projectId || chatMutation.isPending}
                slotProps={{ htmlInput: { maxLength: 4000 } }}
              />
              <Button type="submit" variant="contained" aria-label={t('Send message')} disabled={!projectId || !input.trim() || input.length > 4000 || chatMutation.isPending} startIcon={chatMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <SendOutlined />}>
                {t('Send')}
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              {t('Enter to send · Shift + Enter for a new line')}
            </Typography>
            <Typography variant="caption" color="text.secondary">{t('AI can make mistakes. Review before saving.')}</Typography>
          </Box>
        </Stack>
      </Drawer>

      {projectId && generateOpen ? <GenerateTodosDialog projectId={projectId} onClose={() => setGenerateOpen(false)} /> : null}
      {projectId && planOpen ? <AiSprintPlanningDialog projectId={projectId} onClose={() => setPlanOpen(false)} /> : null}
    </>
  );
}
