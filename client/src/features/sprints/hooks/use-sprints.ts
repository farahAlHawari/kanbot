import { useQuery } from '@tanstack/react-query';
import { listSprints } from '../api/sprints-api';

export const sprintsQueryKey = (projectId: string) => ['sprints', projectId] as const;

export function useSprints(projectId: string) {
  return useQuery({
    queryKey: sprintsQueryKey(projectId),
    queryFn: () => listSprints(projectId),
    enabled: projectId.length > 0,
  });
}
