import { useQuery } from '@tanstack/react-query';
import { listTodos } from '../api/todos-api';

export const todosQueryKey = (projectId: string) => ['todos', projectId] as const;
export const backlogQueryKey = (projectId: string) => [...todosQueryKey(projectId), 'backlog'] as const;

export function useBacklog(projectId: string) {
  return useQuery({
    queryKey: backlogQueryKey(projectId),
    queryFn: () => listTodos(projectId, { sprintId: 'backlog' }),
    enabled: projectId.length > 0,
  });
}
