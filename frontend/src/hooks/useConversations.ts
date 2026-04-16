import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationsApi }                      from '../lib/api';
import toast from 'react-hot-toast';

export function useConversations(params?: {
  status?:  string;
  agentId?: string;
  page?:    number;
}) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey:        ['conversations', params],
    queryFn:         () => conversationsApi.list(params).then((r) => r.data),
    refetchInterval: 30_000,
  });

  const assign = useMutation({
    mutationFn: ({ id, agentId }: { id: string; agentId: string }) =>
      conversationsApi.assign(id, agentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });

  const resolve = useMutation({
    mutationFn: (id: string) => conversationsApi.resolve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Conversation resolved');
    },
  });

  const reopen = useMutation({
    mutationFn: (id: string) => conversationsApi.reopen(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });

  return {
    conversations: query.data?.items ?? [],
    total:         query.data?.total ?? 0,
    isLoading:     query.isLoading,
    mutate:        query.refetch,
    assign:        assign.mutateAsync,
    resolve:       resolve.mutateAsync,
    reopen:        reopen.mutateAsync,
  };
}
