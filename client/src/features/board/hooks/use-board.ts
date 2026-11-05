import { useQuery } from '@tanstack/react-query';
import { getSprintBoard } from '../api/board-api';

export function useSprintBoard(sprintId: string) {
  return useQuery({
    queryKey: ['board', sprintId],
    queryFn: () => getSprintBoard(sprintId),
    enabled: sprintId.length > 0,
  });
}