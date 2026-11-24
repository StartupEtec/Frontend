import React from 'react';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserRole } from '../types/role';
import { colors, spacing, typography, roleAccent } from '../theme/tokens';
import { useConversation } from '../hooks/useConversation';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageList } from '../components/chat/MessageList';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { MessageComposer } from '../components/chat/MessageComposer';
import { CotizacionFloatingButton } from '../components/chat/CotizacionFloatingButton';

export interface ConversationScreenProps {
  /** ID del usuario con el que se chatea (el otro participante). */
  userId: string;
  /** ID del chat (opcional, si ya se conoce). */
  chatId?: string;
  onGoBack: () => void;
  role?: UserRole;
}

/**
 * Pantalla de conversación (Issue #31).
 *
 * Muestra el historial de mensajes, input de texto, adjuntar imágenes con
 * previsualización, indicador de escritura, WebSocket en tiempo real, carga
 * de mensajes anteriores (scroll hacia arriba) y botón "Ir al final".
 * Incluye un botón flotante "Solicitar Cotización" deshabilitado (Issue #32).
 *
 * Todo el contenido respeta las SafeAreas del sistema (Status Bar arriba,
 * Navigation Bar abajo).
 */
export const ConversationScreen: React.FC<ConversationScreenProps> = ({
  userId,
  chatId: initialChatId,
  onGoBack,
  role = 'client',
}) => {
  const accentColor = roleAccent(role);
  const insets = useSafeAreaInsets();

  const {
    chatId,
    myUserId,
    otherUser,
    initStatus,
    initError,
    messages,
    chatStatus,
    chatError,
    isSending,
    typingUserIds,
    imagePreview,
    sendMessage,
    setImagePreview,
    sendPreviewImage,
    removeImagePreview,
    setTyping,
    loadMore,
  } = useConversation({ userId, initialChatId, role });

  // Mientras se inicializa el chat, no renderizamos la UI de conversación.
  if (initStatus === 'loading') {
    return null;
  }

  if (initStatus === 'error' || !chatId || !myUserId || !otherUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {initError ?? 'No se pudo inicializar la conversación'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSendMessage = (text: string) => {
    void sendMessage(text);
  };

  const handleLoadMore = async () => {
    await loadMore();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <ChatHeader
        otherUser={otherUser}
        onGoBack={onGoBack}
        accentColor={accentColor}
        insetsTop={insets.top}
      />

      {/* Indicador de escritura (encima del input) */}
      {typingUserIds.length > 0 && (
        <View style={styles.typingContainer}>
          <TypingIndicator
            typingUserIds={typingUserIds}
            typingUserName={
              typingUserIds.length === 1 ? (otherUser.full_name ?? undefined) : undefined
            }
          />
        </View>
      )}

      {/* Lista de mensajes */}
      <MessageList
        messages={messages}
        myUserId={myUserId}
        accentColor={accentColor}
        onLoadMore={handleLoadMore}
        status={chatStatus}
        error={chatError}
        onRetry={handleLoadMore}
        hasMore={messages.length > 0}
      />

      {/* Compositor de mensaje con previsualización de imagen.
          paddingBottom por insets.bottom evita que quede tapado por la
          Navigation Bar del sistema en Android.
          El contenedor tiene position: 'relative' para que el botón de
          Cotización se posicione de forma responsiva respecto a él. */}
      <View
        style={[styles.composerContainer, { paddingBottom: insets.bottom, position: 'relative' }]}
      >
        <MessageComposer
          onSendMessage={handleSendMessage}
          onAttachImage={setImagePreview}
          onRemovePreview={removeImagePreview}
          onSendPreviewImage={sendPreviewImage}
          onTyping={setTyping}
          imagePreview={imagePreview}
          isSending={isSending}
        />

        {/* Botón "Solicitar Cotización" posicionado sobre la línea divisoria
            entre el chat y el área de input. Se desplaza verticalmente con el
            contenedor del compositor. Queda por encima de la línea divisoria
            para no tapar el botón de enviar. */}
        <CotizacionFloatingButton accentColor={accentColor} top={-24} right={spacing.sm} />
      </View>
    </SafeAreaView>
  );
};

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  typingContainer: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  composerContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    // Sin borderTop para evitar línea doble con el historial de mensajes.
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
} as const;

export default ConversationScreen;
