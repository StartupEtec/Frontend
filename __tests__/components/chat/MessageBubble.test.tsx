import React from 'react';
import { render } from '@testing-library/react-native';
import { MessageBubble } from '../../../src/components/chat/MessageBubble';
import type { ChatMessage } from '../../../src/types/chat';

const makeMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm-1',
  chat_id: 'c-1',
  sender_id: 'user-100',
  content: 'Hola, ¿cómo estás?',
  message_type: 'TEXT',
  attachment_url: null,
  avatar_url: null,
  created_at: '2026-11-24T10:00:00Z',
  ...overrides,
});

describe('MessageBubble', () => {
  it('renders a message from the other user (left bubble)', () => {
    const { getByText } = render(
      <MessageBubble
        message={makeMessage({ sender_id: 'user-100' })}
        isOwn={false}
        accentColor="#004ccd"
      />
    );
    expect(getByText('Hola, ¿cómo estás?')).toBeTruthy();
  });

  it('renders an own message (right bubble)', () => {
    const { getByText } = render(
      <MessageBubble
        message={makeMessage({ sender_id: 'me' })}
        isOwn={true}
        accentColor="#004ccd"
      />
    );
    expect(getByText('Hola, ¿cómo estás?')).toBeTruthy();
  });

  it('renders an image message without crashing', () => {
    const { toJSON } = render(
      <MessageBubble
        message={makeMessage({ message_type: 'IMAGE', attachment_url: '/uploads/img.jpg' })}
        isOwn={false}
        accentColor="#004ccd"
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('shows the time label', () => {
    const { getByText } = render(
      <MessageBubble message={makeMessage()} isOwn={false} accentColor="#004ccd" />
    );
    // toLocaleTimeString con es-AR debería mostrar algo como "10:00"
    expect(getByText(/\d{2}:\d{2}/)).toBeTruthy();
  });
});
