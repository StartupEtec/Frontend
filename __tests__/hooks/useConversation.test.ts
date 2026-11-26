import { renderHook, act } from '@testing-library/react-native';
import { useConversation } from '../../src/hooks/useConversation';
import { chatService } from '../../src/services/chatService';
import { tokenStorage } from '../../src/services/tokenStorage';
import { useChat } from '../../src/hooks/useChat';

jest.mock('../../src/services/chatService', () => ({
  chatService: {
    listChats: jest.fn(),
    createChat: jest.fn(),
  },
}));
jest.mock('../../src/services/tokenStorage', () => ({
  tokenStorage: {
    getAccessToken: jest.fn(),
  },
}));
jest.mock('../../src/hooks/useChat', () => ({
  useChat: jest.fn(),
}));

const mockListChats = chatService.listChats as jest.Mock;
const mockCreateChat = chatService.createChat as jest.Mock;
const mockGetAccessToken = tokenStorage.getAccessToken as jest.Mock;
const mockUseChat = useChat as jest.Mock;

const mockUseChatReturn = {
  messages: [],
  status: 'success',
  error: null,
  isSending: false,
  typingUserIds: [],
  sendMessage: jest.fn(),
  sendImage: jest.fn(),
  loadMore: jest.fn(),
  setTyping: jest.fn(),
  disconnect: jest.fn(),
};

describe('useConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChat.mockReturnValue(mockUseChatReturn);
    mockGetAccessToken.mockResolvedValue(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiX3VzZXIxIn0.SIGNATURA_FAKE'
    );
    mockCreateChat.mockResolvedValue({ chat_id: 'c-nuevo', created: true });
  });

  it('resuelve myUserId desde el JWT', async () => {
    mockListChats.mockResolvedValue({ chats: [], count: 0, limit: 50, offset: 0 });

    const { result } = renderHook(() => useConversation({ userId: 'user-100', role: 'client' }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.myUserId).toBe('_user1');
  });

  it('crea un chat nuevo si no existe uno con el usuario', async () => {
    mockListChats.mockResolvedValue({ chats: [], count: 0, limit: 50, offset: 0 });

    const { result } = renderHook(() => useConversation({ userId: 'user-100', role: 'client' }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCreateChat).toHaveBeenCalledWith({ user_id_2: 'user-100' });
    expect(result.current.chatId).toBe('c-nuevo');
  });

  it('usa un chat existente si ya hay uno con el usuario', async () => {
    mockListChats.mockResolvedValue({
      chats: [
        {
          chat_id: 'c-existente',
          order_id: null,
          last_message_at: null,
          is_favorite: false,
          is_archived: false,
          last_message: null,
          other_user: { user_id: 'user-100', full_name: 'Juan Pérez', avatar_url: null },
          unread_count: 0,
        },
      ],
      count: 1,
      limit: 50,
      offset: 0,
    });

    const { result } = renderHook(() => useConversation({ userId: 'user-100', role: 'client' }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockCreateChat).not.toHaveBeenCalled();
    expect(result.current.chatId).toBe('c-existente');
    expect(result.current.otherUser?.full_name).toBe('Juan Pérez');
  });

  it('usa el initialChatId si se proporciona', async () => {
    const { result } = renderHook(() =>
      useConversation({ userId: 'user-100', initialChatId: 'c-inicial', role: 'client' })
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockListChats).not.toHaveBeenCalled();
    expect(mockCreateChat).not.toHaveBeenCalled();
    expect(result.current.chatId).toBe('c-inicial');
  });

  it('gestiona la previsualización de imagen', () => {
    const { result } = renderHook(() => useConversation({ userId: 'user-100', role: 'client' }));

    act(() => {
      result.current.setImagePreview('file:///preview.jpg');
    });
    expect(result.current.imagePreview).toBe('file:///preview.jpg');

    act(() => {
      result.current.removeImagePreview();
    });
    expect(result.current.imagePreview).toBeNull();
  });

  it('reporta error de inicialización si falla', async () => {
    mockListChats.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useConversation({ userId: 'user-100', role: 'client' }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.initStatus).toBe('error');
    expect(result.current.initError).toBe('No se pudo inicializar el chat');
  });
});
