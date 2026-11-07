import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import TipsAndUpdatesOutlined from '@mui/icons-material/TipsAndUpdatesOutlined';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import SendOutlined from '@mui/icons-material/SendOutlined';
import SummarizeOutlined from '@mui/icons-material/SummarizeOutlined';
import ReactMarkdown from 'react-markdown';
import { ApiError } from '../../../shared/api/errors';
import type { ChatMessage, SprintSummary } from '../../../shared/types/api';
import { useFeedback } from '../../../app/providers/use-feedback';
import { sprintsQueryKey, useSprints } from '../../sprints/hooks/use-sprints';
import { chat, summarizeSprint } from '../api/ai-api';
import { useAiStatus } from '../hooks/use-ai-status';
import { AiModeBadge } from './AiModeBadge';
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
  const [section, setSection] = useState<'chat' | 'tools'>('chat');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [summary, setSummary] = useState<SprintSummary | null>(null);
  const [typing, setTyping] = useState<{ index: number; content: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const animatedMessageIndex = useRef(-1);
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const queryClient = useQueryClient();
  const { notify } = useFeedback();
  const statusQuery = useAiStatus();
  const sprintsQuery = useSprints(projectId ?? '');
  const sprints = sprintsQuery.data?.sprints ?? [];
  const summarySprint = sprints.find((sprint) => sprint.status === 'active')
    ?? sprints.find((sprint) => sprint.status === 'completed');

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open, typing?.content]);

  useEffect(() => {
    const index = messages.length - 1;
    const lastMessage = messages[index];
    if (!lastMessage || lastMessage.role !== 'assistant') return;

    if (reduceMotion) {
      animatedMessageIndex.current = index;
      return;
    }
    if (animatedMessageIndex.current === index) return;

    animatedMessageIndex.current = index;
    const characters = Array.from(lastMessage.content);
    let position = 0;
    setTyping({ index, content: '' });
    const timer = window.setInterval(() => {
      position = Math.min(position + 4, characters.length);
      setTyping({ index, content: characters.slice(0, position).join('') });
      if (position === characters.length) window.clearInterval(timer);
    }, 18);

    return () => window.clearInterval(timer);
  }, [messages, reduceMotion]);

  const chatMutation = useMutation({
    mutationFn: ({ targetProjectId, conversation }: { targetProjectId: string; conversation: ChatMessage[]; content: string }) =>
      chat(targetProjectId, { messages: conversation }),
    onSuccess: ({ message }, variables) => {
      if (variables.targetProjectId === projectId) {
        setMessages((current) => [...current, { role: 'user', content: variables.content }, message]);
      }
    },
    onError: (_failure, variables) => {
      if (variables.targetProjectId === projectId) {
        setInput((current) => current || variables.content);
      }
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

  function submitMessage(rawContent: string) {
    const content = rawContent.trim();
    if (!projectId || !content || chatMutation.isPending || content.length > 4000) return;
    const userMessage: ChatMessage = { role: 'user', content };
    const conversation = [...messages, userMessage].slice(-30);
    setInput('');
    chatMutation.mutate({ targetProjectId: projectId, conversation, content });
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitMessage(input);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.key === 'Enter'
      && !event.shiftKey
      && !event.nativeEvent.isComposing
      && event.nativeEvent.keyCode !== 229
      && typeof window !== 'undefined'
      && window.matchMedia('(pointer: fine)').matches
    ) {
      event.preventDefault();
      event.currentTarget.closest('form')?.requestSubmit();
    }
  }

  function createNewChat() {
    setMessages([]);
    setInput('');
    setTyping(null);
    animatedMessageIndex.current = -1;
    chatMutation.reset();
  }

  const suggestions = [
    t('How is my sprint going?'),
    t('What should I work on next?'),
    t('Help me plan my next sprint.'),
    t('Explain a topic in simple terms.'),
  ];

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        slotProps={{ paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': 'assistant-drawer-title',
          sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100%', height: '100dvh', minHeight: 0, display: 'flex' },
        } }}
      >
        <Stack sx={{ height: '100%', minHeight: 0 }}>
          <Stack spacing={1} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Box component="img" src={kanbotIcon} alt="" aria-hidden="true" sx={{ width: 32, height: 32, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography id="assistant-drawer-title" component="h2" variant="h3">{t('Kanbot Assistant')}</Typography>
                <Typography variant="caption" color="text.secondary">{t('A conversational AI for anything on your mind')}</Typography>
              </Box>
              <Tooltip title={t('New chat')}>
                <IconButton aria-label={t('New chat')} onClick={createNewChat} disabled={chatMutation.isPending}><span aria-hidden="true">＋</span></IconButton>
              </Tooltip>
              <IconButton aria-label={t('Close assistant')} onClick={onClose}><CloseOutlined /></IconButton>
            </Stack>
            <AiModeBadge compact={false} />
          </Stack>

          <Tabs
            value={section}
            onChange={(_, value: 'chat' | 'tools') => setSection(value)}
            variant="fullWidth"
            aria-label={t('Assistant sections')}
            sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
          >
            <Tab
              id="assistant-tab-chat"
              aria-controls="assistant-panel-chat"
              value="chat"
              icon={<ChatBubbleOutlineOutlined />}
              iconPosition="start"
              label={t('Chat')}
            />
            <Tab
              id="assistant-tab-tools"
              aria-controls="assistant-panel-tools"
              value="tools"
              icon={<AutoAwesomeOutlined />}
              iconPosition="start"
              label={t('AI tools')}
            />
          </Tabs>

          <Box
            id="assistant-panel-chat"
            role="tabpanel"
            aria-labelledby="assistant-tab-chat"
            hidden={section !== 'chat'}
            sx={{ flex: 1, minHeight: 0, display: section === 'chat' ? 'flex' : 'none', flexDirection: 'column' }}
          >
            <Box ref={listRef} role="log" aria-label={t('Assistant conversation')} aria-live="off" sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
            {statusQuery.isError ? <Alert severity="warning" sx={{ mb: 1 }}>{t('AI status is unavailable. You can still try a request.')}</Alert> : null}
            {!projectId ? <Alert severity="info" sx={{ mb: 1 }}>{t('Select a project to chat with the assistant.')}</Alert> : null}
            {!messages.length && projectId ? (
              <Stack spacing={1.5} sx={{ alignItems: 'flex-start', py: 2 }}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.subtle' }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                    <TipsAndUpdatesOutlined color="primary" fontSize="small" />
                    <Typography variant="subtitle2">{t('Hi, I’m Kani.')}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {statusQuery.data?.mode === 'mock'
                      ? t('Ask me about your project or type anything else. Mock mode has limited answers; connect an AI model for open-ended chat.')
                      : t('Ask me about your project, explore an idea, learn something new, or just chat. What’s on your mind?')}
                  </Typography>
                </Paper>
                <Typography variant="caption" color="text.secondary">{t('Try asking')}</Typography>
                <Stack spacing={0.75} sx={{ width: '100%' }}>
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outlined"
                      size="small"
                      fullWidth
                      disabled={!projectId || chatMutation.isPending}
                      onClick={() => submitMessage(suggestion)}
                      sx={{ justifyContent: 'flex-start', textAlign: 'left', whiteSpace: 'normal' }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            ) : null}
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
                  '& a': { color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' },
                  '& table': { display: 'block', maxWidth: '100%', overflowX: 'auto', borderCollapse: 'collapse' },
                  '& th, & td': { border: 1, borderColor: 'divider', p: 0.5 },
                }}>
                  <Typography variant="caption" color={message.role === 'user' ? 'inherit' : 'text.secondary'}>{message.role === 'user' ? t('You') : 'Kanbot AI'}</Typography>
                  <Box><ReactMarkdown>{typing?.index === index && !reduceMotion ? typing.content : message.content}</ReactMarkdown></Box>
                </Paper>
              </Stack>
            ))}
            {chatMutation.isPending && chatMutation.variables ? (
              <Stack direction="row-reverse" spacing={1} sx={{ alignItems: 'flex-start', mb: 1.5 }}>
                <Paper variant="outlined" sx={{ maxWidth: '85%', p: 1.5, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: '12px 12px 4px 12px', overflowWrap: 'anywhere' }}>
                  <Typography variant="caption" color="inherit">{t('You')}</Typography>
                  <Typography variant="body2">{chatMutation.variables.content}</Typography>
                </Paper>
              </Stack>
            ) : null}
            {chatMutation.isPending ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary', mb: 1.5 }} role="status" aria-live="polite">
                <CircularProgress size={16} /><Typography>{t('Kani is thinking…')}</Typography>
              </Stack>
            ) : null}
            {chatMutation.isError ? (
              <Alert severity="error" role="alert" sx={{ mb: 1 }} action={
                chatMutation.error instanceof ApiError && [0, 429, 502].includes(chatMutation.error.status) ? (
                  <Button color="inherit" size="small" onClick={() => {
                    if (!chatMutation.variables) return;
                    setInput('');
                    chatMutation.mutate(chatMutation.variables);
                  }}>{t('Retry')}</Button>
                ) : undefined
              }>
                {visibleAiError(chatMutation.error)}
              </Alert>
            ) : null}
            </Box>
            <Box component="form" onSubmit={sendMessage} sx={{ p: 2, pb: 'calc(16px + env(safe-area-inset-bottom, 0px))', borderTop: 1, borderColor: 'divider' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
                <TextField
                  label={t('Message')}
                  placeholder={t('Ask me anything...')}
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
          </Box>

          <Box
            id="assistant-panel-tools"
            role="tabpanel"
            aria-labelledby="assistant-tab-tools"
            hidden={section !== 'tools'}
            sx={{ flex: 1, minHeight: 0, display: section === 'tools' ? 'block' : 'none', overflowY: 'auto', p: 2 }}
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography component="h3" variant="h4">{t('AI tools')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('Choose a focused action for this project.')}
                </Typography>
              </Box>
              {!projectId ? <Alert severity="info">{t('Select a project to use AI tools.')}</Alert> : null}

              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <AutoAwesomeOutlined color="primary" fontSize="small" sx={{ mt: 0.25 }} />
                    <Box>
                      <Typography variant="subtitle2">{t('Plan a sprint')}</Typography>
                      <Typography variant="body2" color="text.secondary">{t('Build a sprint plan from your backlog, capacity, and focus.')}</Typography>
                    </Box>
                  </Stack>
                  <Button size="small" variant="outlined" disabled={!projectId || chatMutation.isPending || summaryMutation.isPending} onClick={() => setPlanOpen(true)}>
                    {t('Plan sprint')}
                  </Button>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <AutoAwesomeOutlined color="primary" fontSize="small" sx={{ mt: 0.25 }} />
                    <Box>
                      <Typography variant="subtitle2">{t('Generate Todos')}</Typography>
                      <Typography variant="body2" color="text.secondary">{t('Turn a feature idea into actionable backlog Todos.')}</Typography>
                    </Box>
                  </Stack>
                  <Button size="small" variant="outlined" disabled={!projectId || chatMutation.isPending || summaryMutation.isPending} onClick={() => setGenerateOpen(true)}>
                    {t('Create todos')}
                  </Button>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <SummarizeOutlined color="primary" fontSize="small" sx={{ mt: 0.25 }} />
                    <Box>
                      <Typography variant="subtitle2">{t('Sprint summary')}</Typography>
                      <Typography variant="body2" color="text.secondary">{t('Summarize progress for the active or most recent completed sprint.')}</Typography>
                    </Box>
                  </Stack>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={summaryMutation.isPending ? <CircularProgress size={16} /> : <SummarizeOutlined />}
                    disabled={!summarySprint || summaryMutation.isPending || chatMutation.isPending}
                    onClick={() => summarySprint && projectId && summaryMutation.mutate({ targetProjectId: projectId, sprintId: summarySprint.id })}
                  >
                    {summaryMutation.isPending ? t('Generating summary…') : t('Generate summary')}
                  </Button>
                  {!summarySprint ? <Typography variant="caption" color="text.secondary">{t('Start a sprint or complete one to generate a summary.')}</Typography> : null}
                </Stack>
              </Paper>

              {statusQuery.isError ? <Alert severity="warning">{t('AI status is unavailable. You can still try a request.')}</Alert> : null}
              {summaryMutation.isError ? (
                <Alert severity="error" role="alert" action={
                  summaryMutation.error instanceof ApiError && (summaryMutation.error.status === 429 || summaryMutation.error.status === 502) ? (
                    <Button color="inherit" size="small" onClick={() => summaryMutation.variables && summaryMutation.mutate(summaryMutation.variables)}>{t('Retry')}</Button>
                  ) : undefined
                }>
                  {visibleAiError(summaryMutation.error)}
                </Alert>
              ) : null}
              {summary ? (
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="subtitle2">{t('Latest summary')}</Typography>
                  <ReactMarkdown>{summary.content}</ReactMarkdown>
                  <Typography variant="caption" color="text.secondary">{t('Generated')} {new Date(summary.generatedAt).toLocaleString('en')} · {summary.source}</Typography>
                </Paper>
              ) : null}
            </Stack>
          </Box>
        </Stack>
      </Drawer>
      {projectId && generateOpen ? <GenerateTodosDialog projectId={projectId} onClose={() => setGenerateOpen(false)} /> : null}
      {projectId && planOpen ? <AiSprintPlanningDialog projectId={projectId} onClose={() => setPlanOpen(false)} /> : null}
    </>
  );
}
