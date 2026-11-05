import { request } from '../../../shared/api/api-client';
import type {
  AiStatusResponse,
  ChatRequest,
  ChatResponse,
  GenerateTodosRequest,
  GenerateTodosResponse,
  PlanSprintRequest,
  PlanSprintResponse,
  SprintSummaryResponse,
} from '../../../shared/types/api';

export const getAiStatus = () => request<AiStatusResponse>('/ai/status');

export const chat = (projectId: string, input: ChatRequest) =>
  request<ChatResponse>(`/projects/${projectId}/ai/chat`, { method: 'POST', body: input });

export const generateTodos = (projectId: string, input: GenerateTodosRequest) =>
  request<GenerateTodosResponse>(`/projects/${projectId}/ai/generate-todos`, { method: 'POST', body: input });

export const planSprint = (projectId: string, input: PlanSprintRequest) =>
  request<PlanSprintResponse>(`/projects/${projectId}/ai/plan-sprint`, { method: 'POST', body: input });

export const summarizeSprint = (sprintId: string) =>
  request<SprintSummaryResponse>(`/sprints/${sprintId}/ai/summary`, { method: 'POST' });