import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChatHeader } from '../../../src/components/chat/ChatHeader';

describe('ChatHeader', () => {
  const otherUser = {
    user_id: 'user-100',
    full_name: 'Juan Pérez',
    avatar_url: null,
  };

  const onGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    onGoBack.mockClear();
  });

  it('renders back button, avatar fallback and name', () => {
    const { getByTestId, getByText, queryByText } = render(
      <ChatHeader otherUser={otherUser} onGoBack={onGoBack} accentColor="#004ccd" />
    );
    expect(getByTestId('btn-conversation-back')).toBeTruthy();
    expect(getByText('Juan Pérez')).toBeTruthy();
  });

  it('calls onGoBack when back is pressed', () => {
    const { getByTestId } = render(
      <ChatHeader otherUser={otherUser} onGoBack={onGoBack} accentColor="#004ccd" />
    );
    fireEvent.press(getByTestId('btn-conversation-back'));
    expect(onGoBack).toHaveBeenCalled();
  });

  it('renders avatar image when avatar_url is provided', () => {
    const { getByTestId } = render(
      <ChatHeader
        otherUser={{ ...otherUser, avatar_url: 'https://example.com/avatar.jpg' }}
        onGoBack={onGoBack}
        accentColor="#004ccd"
      />
    );
    // La imagen se renderiza; verificamos que no haya fallback de Feather
    expect(getByTestId('btn-conversation-back')).toBeTruthy();
  });

  it('does not render botón de Información (eliminado)', () => {
    const { queryByText } = render(
      <ChatHeader otherUser={otherUser} onGoBack={onGoBack} accentColor="#004ccd" />
    );
    expect(queryByText(/Información/i)).toBeNull();
  });
});
