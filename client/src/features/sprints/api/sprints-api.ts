import { request } from '../../../shared/api/api-client';
import type {
  CompleteSprintRequest,
  CreateSprintRequest,
  Sprint,
  SprintListResponse,
  StartSprintRequest,
  UpdateSprintRequest,
} from '../../../shared/types/api';

export const listSprints = (projectId: string) =>
  request<SprintListResponse>(`/projects/${projectId}/sprints`);

export const createSprint = (projectId: string, input: CreateSprintRequest) =>
  request<{ sprint: Sprint }>(`/projects/${projectId}/sprints`, { method: 'POST', body: input });

export const getSprint = (sprintId: string) => request<{ sprint: Sprint }>(`/sprints/${sprintId}`);

export const updateSprint = (sprintId: string, input: UpdateSprintRequest) =>
  request<{ sprint: Sprint }>(`/sprints/${sprintId}`, { method: 'PATCH', body: input });

export const deleteSprint = (sprintId: string) => request<void>(`/sprints/${sprintId}`, { method: 'DELETE' });

export const startSprint = (sprintId: string, input: StartSprintRequest = {}) =>
  request<{ sprint: Sprint }>(`/sprints/${sprintId}/start`, { method: 'POST', body: input });

export const completeSprint = (sprintId: string, input: CompleteSprintRequest) =>
  request<{ sprint: Sprint }>(`/sprints/${sprintId}/complete`, { method: 'POST', body: input });