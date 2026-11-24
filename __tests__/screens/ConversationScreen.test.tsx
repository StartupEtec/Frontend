import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ConversationScreen } from '../../src/screens/ConversationScreen';
import { useConversation } from '../../src/hooks/useConversation';

jest.mock('../../src/hooks/useConversation', () => ({
  useConversation: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockUseConversation = useConversation as jest.Mock;

const mockConversationReturn = {
  chatId: 'c-1',
  myUserId: 'me',
  otherUser: { user_id: 'user-100', full_name: 'Juan Pérez', avatar_url: null },
  initStatus: 'success' as const,
  initError: null,
  messages: [],
  chatStatus: 'success' as const,
  chatError: null,
  isSending: false,
  typingUserIds: [],
  imagePreview: null,
  sendMessage: jest.fn(),
  setImagePreview: jest.fn(),
  sendPreviewImage: jest.fn(),
  removeImagePreview: jest.fn(),
  setTyping: jest.fn(),
  loadMore: jest.fn(),
};

describe('ConversationScreen', () => {
  const onGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConversation.mockReset();
    onGoBack.mockClear();
    mockUseConversation.mockReturnValue(mockConversationReturn);
  });

  it('renderiza null mientras inicializa (initStatus loading)', () => {
    mockUseConversation.mockReturnValue({
      ...mockConversationReturn,
      initStatus: 'loading',
    });

    const { queryByText } = render(
      <ConversationScreen userId="user-100" onGoBack={onGoBack} role="client" />
    );
    // Mientras carga, el componente devuelve null (sin contenido de chat)
    expect(queryByText('Chat')).toBeNull();
  });

  it('renderiza header, lista de mensajes, compositor y botón flotante cuando está listo', () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(
      <ConversationScreen userId="user-100" onGoBack={onGoBack} role="client" />
    );
    expect(getByTestId('btn-conversation-back')).toBeTruthy();
    expect(getByText('Juan Pérez')).toBeTruthy();
    expect(getByPlaceholderText('Escribe un mensaje...')).toBeTruthy();
    expect(getByTestId('btn-cotizacion-flotante')).toBeTruthy();
  });

  it('no renderiza botón de Información', () => {
    const { queryByText } = render(
      <ConversationScreen userId="user-100" onGoBack={onGoBack} role="client" />
    );
    expect(queryByText(/Información/i)).toBeNull();
  });

  it('muestra error cuando initStatus es error', () => {
    mockUseConversation.mockReturnValue({
      ...mockConversationReturn,
      initStatus: 'error',
      initError: 'No se pudo inicializar el chat',
      chatId: null,
      myUserId: null,
      otherUser: null,
    });

    const { getByText } = render(
      <ConversationScreen userId="user-100" onGoBack={onGoBack} role="client" />
    );
    expect(getByText('No se pudo inicializar el chat')).toBeTruthy();
  });

  it('llama onGoBack al presionar volver', () => {
    const { getByTestId } = render(
      <ConversationScreen userId="user-100" onGoBack={onGoBack} role="client" />
    );
    fireEvent.press(getByTestId('btn-conversation-back'));
    expect(onGoBack).toHaveBeenCalled();
  });
});
