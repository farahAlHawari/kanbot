import { request } from '../../../shared/api/api-client';
import type { CreateProjectRequest, ProjectWithStats, UpdateProjectRequest } from '../../../shared/types/api';

export const listProjects = () => request<{ projects: ProjectWithStats[] }>('/projects');
export const getProject = (projectId: string) => request<{ project: ProjectWithStats }>(`/projects/${projectId}`);
export const createProject = (input: CreateProjectRequest) =>
  request<{ project: ProjectWithStats }>('/projects', { method: 'POST', body: input });
export const updateProject = (projectId: string, input: UpdateProjectRequest) =>
  request<{ project: ProjectWithStats }>(`/projects/${projectId}`, { method: 'PATCH', body: input });
export const deleteProject = (projectId: string) =>
  request<void>(`/projects/${projectId}`, { method: 'DELETE' });