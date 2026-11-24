import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChatListItem } from '../../../src/components/chat/ChatListItem';
type ChatListItemType = Parameters<typeof ChatListItem>[0]['chat'];

const makeChat = (overrides: Partial<ChatListItemType> = {}): ChatListItemType => ({
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

describe('ChatListItem', () => {
  it('renders the chat item with name and last message', () => {
    const onPress = jest.fn();
    const { getByText, getByTestId } = render(<ChatListItem chat={makeChat()} onPress={onPress} />);

    expect(getByText('Juan Pérez')).toBeTruthy();
    expect(getByText('Hola, ¿cómo estás?')).toBeTruthy();
    expect(getByTestId('chat-item-c-1')).toBeTruthy();
  });

  it('shows unread count badge when unread_count > 0', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ChatListItem chat={makeChat({ unread_count: 3 })} onPress={onPress} />
    );

    expect(getByText('3')).toBeTruthy();
  });

  it('calls onPress with other_user.user_id when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<ChatListItem chat={makeChat()} onPress={onPress} />);

    fireEvent.press(getByTestId('chat-item-c-1'));

    expect(onPress).toHaveBeenCalledWith('user-100');
  });

  it('shows "Sin mensajes" when there is no last message', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ChatListItem chat={makeChat({ last_message: null })} onPress={onPress} />
    );

    expect(getByText('Sin mensajes')).toBeTruthy();
  });
});
