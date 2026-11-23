import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useChats } from '../../src/hooks/useChats';
import { chatService } from '../../src/services/chatService';
import { ChatListItem } from '../../src/types/chat';

jest.mock('../../src/services/chatService', () => ({
  chatService: {
    list: jest.fn(),
    defaultParams: jest.fn().mockReturnValue({
      limit: 20,
      offset: 0,
      status: 'all',
      search: '',
    }),
  },
  CHATS_PAGE_SIZE: 20,
}));

const list = chatService.list as jest.Mock;

const makeChat = (overrides: Partial<ChatListItem> = {}): ChatListItem => ({
  chat_id: 'c-1',
  order_id: 'o-1',
  last_message_at: '2026-11-22T10:00:00Z',
  is_favorite: false,
  is_archived: false,
  last_message: {
    message_id: 'm-1',
    text: 'Hola, ¿cómo estás?',
    sender_id: 'user-100',
    created_at: '2026-11-22T10:00:00Z',
    read: true,
  },
  other_user: {
    user_id: 'user-100',
    full_name: 'Juan Pérez',
    avatar_url: null,
  },
  unread_count: 0,
  ...overrides,
});

const responseFor = (chats: ChatListItem[]) => ({
  chats,
  count: chats.length,
  limit: 20,
  offset: 0,
});

describe('useChats', () => {
  beforeEach(() => {
    list.mockReset();
  });

  it('loads the first page on mount', async () => {
    list.mockResolvedValue(responseFor([makeChat()]));

    const { result } = renderHook(() => useChats());

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.chats).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(list).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      status: 'all',
      search: '',
    });
  });

  it('shows error when the list fails', async () => {
    list.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderHook(() => useChats());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBeTruthy();
    expect(result.current.chats).toEqual([]);
  });

  it('setSearch triggers a new search with offset 0', async () => {
    list.mockResolvedValue(responseFor([makeChat()]));

    const { result } = renderHook(() => useChats());

    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => {
      result.current.setSearch('juan');
    });

    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({
        limit: 20,
        offset: 0,
        status: 'all',
        search: 'juan',
      })
    );
  });

  it('reload loads the first page again', async () => {
    list.mockResolvedValue(responseFor([makeChat()]));

    const { result } = renderHook(() => useChats());

    await waitFor(() => expect(result.current.status).toBe('success'));

    list.mockResolvedValueOnce(responseFor([]));

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.chats).toHaveLength(0));
    expect(list).toHaveBeenCalledTimes(2);
  });
});
