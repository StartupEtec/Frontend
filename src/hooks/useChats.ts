import { useCallback, useEffect, useState } from 'react';
import { chatService } from '../services/chatService';
import { ChatListItem, ChatListParams } from '../types/chat';
import { ApiError } from '../services/api';

export type ChatsStatus = 'idle' | 'loading' | 'success' | 'error';

function chatsErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.message) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'No pudimos cargar los chats. Reintentá.';
}

/**
 * Hook para cargar y gestionar la lista de chats del usuario autenticado.
 *
 * Expone: chats, total, status, error, loadingMore, loadMoreError, hasMore,
 * reload, loadMore, setSearch, setParams.
 *
 * La búsqueda por nombre se hace en el backend (parámetro `search`), así que
 * cada cambio de texto dispara una nueva petición a la primera página.
 */
export const useChats = () => {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [status, setStatus] = useState<ChatsStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [params, setParams] = useState<ChatListParams>(chatService.defaultParams());

  const load = useCallback(async (nextParams: ChatListParams) => {
    setStatus('loading');
    setError(null);
    setLoadMoreError(null);
    try {
      const result = await chatService.list(nextParams);
      setChats(result.chats);
      setTotal(result.count);
      setParams(nextParams);
      setStatus('success');
    } catch (err: unknown) {
      setChats([]);
      setTotal(0);
      setError(chatsErrorMessage(err));
      setStatus('error');
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    if (total != null && chats.length >= total) return;

    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const result = await chatService.list({
        ...params,
        offset: chats.length,
      });
      setChats((current) => {
        const existingIds = new Set(current.map((c) => c.chat_id));
        const newChats = result.chats.filter((c) => !existingIds.has(c.chat_id));
        return [...current, ...newChats];
      });
      setTotal(result.count);
    } catch (err: unknown) {
      setLoadMoreError(chatsErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }, [chats.length, params, total]);

  const setSearch = useCallback(
    (search: string) => {
      void load({ ...params, search, offset: 0 });
    },
    [load, params]
  );

  useEffect(() => {
    void load(params);
  }, [load, params]);

  return {
    chats,
    total,
    status,
    error,
    loadingMore,
    loadMoreError,
    hasMore: total != null && chats.length < total,
    reload: () => void load(params),
    loadMore,
    setSearch,
    setParams,
  };
};

export default useChats;
