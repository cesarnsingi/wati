import { useQuery, useQueryClient } from '@tanstack/react-query';
import { messagesApi }              from '../lib/api';

export function useMessages(conversationId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn:  () =>
      conversationId
        ? messagesApi.list(conversationId).then((r) => r.data.items)
        : Promise.resolve([]),
    enabled:       !!conversationId,
    refetchInterval: 0,  // Socket.io handles live updates
  });

  const sendText = async (content: string, replyToId?: string) => {
    if (!conversationId) return;
    try {
      await messagesApi.sendText({ conversationId, content, replyToWaId: replyToId });
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err) {
      console.error('[sendText]', err);
      throw err;
    }
  };

  const sendTemplate = async (
    templateName:     string,
    templateLanguage: string,
    components?:      any[],
  ) => {
    if (!conversationId) return;
    await messagesApi.sendTemplate({ conversationId, templateName, templateLanguage, components });
    qc.invalidateQueries({ queryKey: ['messages', conversationId] });
    qc.invalidateQueries({ queryKey: ['conversations'] });
  };

  return {
    messages:     query.data ?? [],
    isLoading:    query.isLoading,
    refetch:      query.refetch,
    sendText,
    sendTemplate,
  };
}
