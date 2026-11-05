import { request } from '../../../shared/api/api-client';
import type { SprintBoardResponse } from '../../../shared/types/api';

export const getSprintBoard = (sprintId: string) =>
  request<SprintBoardResponse>(`/sprints/${sprintId}/todos`);