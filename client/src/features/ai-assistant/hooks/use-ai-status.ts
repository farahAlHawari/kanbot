import { useQuery } from '@tanstack/react-query';
import { getAiStatus } from '../api/ai-api';

export const AI_STATUS_QUERY_KEY = ['ai-status'] as const;

export function useAiStatus() {
  return useQuery({
    queryKey: AI_STATUS_QUERY_KEY,
    queryFn: getAiStatus,
    staleTime: 5 * 60_000,
  });
}
