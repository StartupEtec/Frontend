import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MessageList } from '../../../src/components/chat/MessageList';
import type { ChatMessage } from '../../../src/types/chat';

const makeMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm-1',
  chat_id: 'c-1',
  sender_id: 'user-100',
  content: 'Hola',
  message_type: 'TEXT',
  attachment_url: null,
  avatar_url: null,
  created_at: '2026-11-24T10:00:00Z',
  ...overrides,
});

describe('MessageList', () => {
  const onLoadMore = jest.fn();
  const onRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    onLoadMore.mockClear();
    onRetry.mockClear();
  });

  it('renders messages list', () => {
    const { getByText } = render(
      <MessageList
        messages={[
          makeMessage({ sender_id: 'user-100' }),
          makeMessage({ id: 'm-2', sender_id: 'me', content: 'Yo' }),
        ]}
        myUserId="me"
        accentColor="#004ccd"
        onLoadMore={onLoadMore}
        status="success"
        error={null}
        onRetry={onRetry}
      />
    );
    expect(getByText('Hola')).toBeTruthy();
    expect(getByText('Yo')).toBeTruthy();
  });

  it('shows loading state when no messages', () => {
    const { getByText } = render(
      <MessageList
        messages={[]}
        myUserId="me"
        accentColor="#004ccd"
        onLoadMore={onLoadMore}
        status="loading"
        error={null}
        onRetry={onRetry}
      />
    );
    expect(getByText('Cargando mensajes...')).toBeTruthy();
  });

  it('shows error state with retry button', () => {
    const { getByText, getByTestId } = render(
      <MessageList
        messages={[]}
        myUserId="me"
        accentColor="#004ccd"
        onLoadMore={onLoadMore}
        status="error"
        error="No se pudo cargar"
        onRetry={onRetry}
      />
    );
    expect(getByText('No se pudo cargar')).toBeTruthy();
    expect(getByTestId('btn-chat-retry')).toBeTruthy();
  });

  it('calls onRetry when retry button is pressed', () => {
    const { getByTestId } = render(
      <MessageList
        messages={[]}
        myUserId="me"
        accentColor="#004ccd"
        onLoadMore={onLoadMore}
        status="error"
        error="No se pudo cargar"
        onRetry={onRetry}
      />
    );
    fireEvent.press(getByTestId('btn-chat-retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('shows empty state when idle with no messages', () => {
    const { getByText } = render(
      <MessageList
        messages={[]}
        myUserId="me"
        accentColor="#004ccd"
        onLoadMore={onLoadMore}
        status="idle"
        error={null}
        onRetry={onRetry}
      />
    );
    expect(getByText('No hay mensajes aún.')).toBeTruthy();
  });

  it('calls onLoadMore when scrolling near the top', () => {
    const { getByTestId } = render(
      <MessageList
        messages={[
          makeMessage(),
          makeMessage({ id: 'm-2' }),
          makeMessage({ id: 'm-3' }),
          makeMessage({ id: 'm-4' }),
          makeMessage({ id: 'm-5' }),
          makeMessage({ id: 'm-6' }),
        ]}
        myUserId="me"
        accentColor="#004ccd"
        onLoadMore={onLoadMore}
        status="success"
        error={null}
        onRetry={onRetry}
        hasMore={true}
      />
    );
    const scrollView = getByTestId('scroll-messages');
    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { y: 0 },
        contentSize: { height: 1000 },
        layoutMeasurement: { height: 200 },
      },
    });
    expect(onLoadMore).toHaveBeenCalled();
  });
});
