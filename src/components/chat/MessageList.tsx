import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChatMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';
import { ScrollToBottomButton } from './ScrollToBottomButton';
import { colors, spacing, typography } from '../../theme/tokens';

export interface MessageListProps {
  /** Lista de mensajes a renderizar. */
  messages: ChatMessage[];
  /** ID del usuario autenticado (para diferenciar mensajes propios). */
  myUserId: string;
  /** Color de acento del rol activo. */
  accentColor: string;
  /** Callback para cargar mensajes anteriores al llegar al tope. */
  onLoadMore: () => void;
  /** Estado de carga. */
  status: 'idle' | 'loading' | 'success' | 'error';
  /** Error (si lo hay). */
  error: string | null;
  /** Callback de reintento. */
  onRetry: () => void;
  /** Si hay más mensajes para cargar (paginación). */
  hasMore?: boolean;
}

/**
 * Lista de mensajes con:
 * - Renderizado de burbujas (propias vs ajenas)
 * - Renderizado de mensajes del sistema (message_type: 'QUOTE') como burbujas
 *   centradas con estilo de píldora
 * - Estado loading / error / vacío
 * - Carga de mensajes anteriores al hacer scroll hacia arriba (onScroll cerca del tope)
 * - Botón flotante "Ir al final" (sin auto-scroll automático)
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  myUserId,
  accentColor,
  onLoadMore,
  status,
  error,
  onRetry,
  hasMore = true,
}) => {
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const isNearTopRef = useRef(false);

  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset } = event.nativeEvent;
      const paddingTop = 16;
      // Cerca del tope (con margen): disparar carga de mensajes anteriores
      if (contentOffset.y <= paddingTop + 4 && hasMore) {
        if (!isNearTopRef.current) {
          isNearTopRef.current = true;
          onLoadMore();
        }
      } else {
        isNearTopRef.current = false;
      }
    },
    [hasMore, onLoadMore]
  );

  const handleScrollToBottom = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <View style={styles.wrapper}>
      {status === 'loading' && isEmpty && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text style={styles.loadingText}>Cargando mensajes...</Text>
        </View>
      )}

      {status === 'error' && isEmpty && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error ?? 'Error al cargar mensajes'}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: accentColor }]}
            onPress={onRetry}
            testID="btn-chat-retry"
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {(status !== 'loading' || messages.length > 0) && (
        <ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          contentContainerStyle={styles.messagesContainer}
          keyboardShouldPersistTaps="handled"
          testID="scroll-messages"
        >
          {/* Deduplicar por id para evitar claves repetidas (race condition
              entre mensaje optimista y WebSocket) */}
          {messages
            .filter((msg, index, self) => index === self.findIndex(m => m.id === msg.id))
            .map((message) => {
              const isSystem = message.message_type === 'QUOTE';
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={!isSystem && message.sender_id === myUserId}
                  isSystem={isSystem}
                  accentColor={accentColor}
                />
              );
            })}
          {messages.length > 5 && (
            <ScrollToBottomButton
              onScrollToBottom={handleScrollToBottom}
              accentColor={accentColor}
            />
          )}
        </ScrollView>
      )}

      {isEmpty && status === 'idle' && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay mensajes aún.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  retryText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
