import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100%', display: 'flex' } } }}
      >
        <Stack sx={{ height: '100%', minHeight: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="h2" variant="h3">Kanbot AI</Typography>
              {statusQuery.data?.mode === 'ai' && statusQuery.data.model ? (
                <Typography variant="caption" color="text.secondary">{statusQuery.data.model}</Typography>
              ) : null}
            </Box>
            {statusQuery.data?.mode === 'mock' ? <Chip size="small" label="Mock AI" variant="outlined" /> : null}
            <Tooltip title="New chat">
              <IconButton aria-label="New chat" onClick={createNewChat} disabled={chatMutation.isPending}><span aria-hidden="true">＋</span></IconButton>
            </Tooltip>
            <IconButton aria-label="Close assistant" onClick={onClose}><CloseOutlined /></IconButton>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
            <Button size="small" variant="outlined" disabled={!projectId} onClick={() => setGenerateOpen(true)}>Create todos</Button>
            <Button size="small" variant="outlined" disabled={!projectId} onClick={() => setPlanOpen(true)}>Plan sprint</Button>
            <Button size="small" variant="outlined" disabled={!summarySprint || summaryMutation.isPending} onClick={() => summarySprint && projectId && summaryMutation.mutate({ targetProjectId: projectId, sprintId: summarySprint.id })}>
              Summarize sprint
            </Button>
          </Stack>

          <Box ref={listRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
            {statusQuery.isError ? <Alert severity="warning" sx={{ mb: 1 }}>AI status is unavailable. You can still try a request.</Alert> : null}
            {!projectId ? <Alert severity="info" sx={{ mb: 1 }}>Select a project to chat with the assistant.</Alert> : null}
            {messages.map((message, index) => (
              <Paper key={`${index}-${message.role}`} variant="outlined" sx={{ p: 1.5, mb: 1.5, bgcolor: message.role === 'user' ? 'action.hover' : 'background.paper' }}>
                <Typography variant="caption" color="text.secondary">{message.role === 'user' ? 'You' : 'Kanbot AI'}</Typography>
                <Box sx={{ overflowWrap: 'anywhere', '& p:first-of-type': { mt: 0.5 }, '& p:last-child': { mb: 0 } }}>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </Box>
              </Paper>
            ))}
            {chatMutation.isPending ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary', mb: 1.5 }}>
                <CircularProgress size={16} /><Typography>Thinking...</Typography>
              </Stack>
            ) : null}
            {chatMutation.isError ? (
              <Alert severity="error" sx={{ mb: 1 }} action={
                chatMutation.error instanceof ApiError && chatMutation.error.status === 502 ? (
                  <Button color="inherit" size="small" onClick={() => chatMutation.variables && chatMutation.mutate(chatMutation.variables)}>Retry</Button>
                ) : undefined
              }>
                {visibleAiError(chatMutation.error)}
              </Alert>
            ) : null}
            {summaryMutation.isError ? (
              <Alert severity="error" sx={{ mb: 1 }} action={
                summaryMutation.error instanceof ApiError && summaryMutation.error.status === 502 ? (
                  <Button color="inherit" size="small" onClick={() => summaryMutation.variables && summaryMutation.mutate(summaryMutation.variables)}>Retry</Button>
                ) : undefined
              }>
                {visibleAiError(summaryMutation.error)}
              </Alert>
            ) : null}
            {summary ? (
              <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
                <Typography variant="subtitle2">Sprint summary</Typography>
                <ReactMarkdown>{summary.content}</ReactMarkdown>
                <Typography variant="caption" color="text.secondary">Generated {new Date(summary.generatedAt).toLocaleString()} · {summary.source}</Typography>
              </Paper>
            ) : null}
          </Box>

          <Box component="form" onSubmit={sendMessage} sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
              <TextField
                label="Message"
                placeholder="Ask about this project..."
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
              <IconButton type="submit" color="primary" aria-label="Send message" disabled={!projectId || !input.trim() || input.length > 4000 || chatMutation.isPending}>
                {chatMutation.isPending ? <CircularProgress size={22} /> : <SendOutlined />}
              </IconButton>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              Enter to send · Shift + Enter for a new line
            </Typography>
            <Typography variant="caption" color="text.secondary">AI can make mistakes. Review before saving.</Typography>
          </Box>
        </Stack>
      </Drawer>

      {projectId && generateOpen ? <GenerateTodosDialog projectId={projectId} onClose={() => setGenerateOpen(false)} /> : null}
      {projectId && planOpen ? <AiSprintPlanningDialog projectId={projectId} onClose={() => setPlanOpen(false)} /> : null}
    </>
  );
}
