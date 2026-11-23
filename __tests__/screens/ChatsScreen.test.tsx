import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ChatsScreen } from '../../src/screens/ChatsScreen';
import { chatService } from '../../src/services/chatService';
import { ApiError } from '../../src/services/api';
import type { ChatListItem } from '../../src/types/chat';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

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
}));

const mockList = chatService.list as jest.Mock;

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

const renderScreen = (props?: Partial<React.ComponentProps<typeof ChatsScreen>>) => {
  const defaultProps = {
    role: 'client' as const,
    onGoBack: jest.fn(),
    onNavigateToConversation: jest.fn(),
    ...props,
  };
  return { ...render(<ChatsScreen {...defaultProps} />), ...defaultProps };
};

describe('ChatsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockList.mockResolvedValue({ chats: [], count: 0, limit: 20, offset: 0 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows loading state while chats load', () => {
    mockList.mockReturnValue(new Promise(() => undefined));

    const { getByText } = renderScreen();

    expect(getByText('Cargando conversaciones...')).toBeTruthy();
    expect(mockList).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
      status: 'all',
      search: '',
    });
  });

  it('shows chats list once loaded', async () => {
    mockList.mockResolvedValue({ chats: [makeChat()], count: 1, limit: 20, offset: 0 });

    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText('Juan Pérez')).toBeTruthy());
    expect(getByText('Hola, ¿cómo estás?')).toBeTruthy();
  });

  it('shows empty state when there are no chats', async () => {
    mockList.mockResolvedValue({ chats: [], count: 0, limit: 20, offset: 0 });

    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText('Todavía no tienes conversaciones.')).toBeTruthy());
  });

  it('shows error and retry button when loading fails', async () => {
    mockList.mockRejectedValueOnce(new ApiError('Error de servidor', 500));

    const { getByText, getByTestId } = renderScreen();

    await waitFor(() => expect(getByText('Error de servidor')).toBeTruthy());
    expect(getByTestId('btn-chats-retry')).toBeTruthy();
  });

  it('retries loading when retry button is pressed', async () => {
    mockList
      .mockRejectedValueOnce(new ApiError('Error de servidor', 500))
      .mockResolvedValueOnce({ chats: [makeChat()], count: 1, limit: 20, offset: 0 });

    const { getByText, getByTestId } = renderScreen();

    await waitFor(() => expect(getByText('Error de servidor')).toBeTruthy());
    fireEvent.press(getByTestId('btn-chats-retry'));

    await waitFor(() => expect(getByText('Juan Pérez')).toBeTruthy());
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('navigates back', () => {
    const onGoBack = jest.fn();
    mockList.mockReturnValue(new Promise(() => undefined));

    const { getByTestId } = renderScreen({ onGoBack });

    fireEvent.press(getByTestId('btn-chats-back'));

    expect(onGoBack).toHaveBeenCalled();
  });

  it('navigates to conversation when a chat is pressed', async () => {
    const onNavigateToConversation = jest.fn();
    mockList.mockResolvedValue({ chats: [makeChat()], count: 1, limit: 20, offset: 0 });

    const { getByText, getByTestId } = renderScreen({ onNavigateToConversation });

    await waitFor(() => expect(getByText('Juan Pérez')).toBeTruthy());
    fireEvent.press(getByTestId('chat-item-c-1'));

    expect(onNavigateToConversation).toHaveBeenCalledWith('c-1');
  });

  it('filters chats by search text', async () => {
    mockList.mockResolvedValue({
      chats: [
        makeChat(),
        makeChat({
          chat_id: 'c-2',
          other_user: { ...makeChat().other_user, full_name: 'María Gómez' },
        }),
      ],
      count: 2,
      limit: 20,
      offset: 0,
    });

    const { getByText, getByTestId, queryByText } = renderScreen();

    await waitFor(() => expect(getByText('Juan Pérez')).toBeTruthy());
    expect(getByText('María Gómez')).toBeTruthy();

    fireEvent.changeText(getByTestId('input-chats-search'), 'Juan');

    await waitFor(() => expect(getByText('Juan Pérez')).toBeTruthy());
    // María no debería aparecer tras filtrar por "Juan"
    expect(queryByText('María Gómez')).toBeNull();
  });

  it('shows unread count badge', async () => {
    mockList.mockResolvedValue({
      chats: [makeChat({ unread_count: 5 })],
      count: 1,
      limit: 20,
      offset: 0,
    });

    const { getByText } = renderScreen();

    await waitFor(() => expect(getByText('5')).toBeTruthy());
  });
});
