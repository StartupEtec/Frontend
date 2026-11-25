import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '../services/api';
import { chatService } from '../services/chatService';
import { UserRole } from '../types/role';
import { colors, spacing, borderRadius, typography, roleAccent } from '../theme/tokens';
import { useConversation } from '../hooks/useConversation';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageList } from '../components/chat/MessageList';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { MessageComposer } from '../components/chat/MessageComposer';
import { QuoteRequestButton } from '../components/chat/QuoteRequestButton';
import { QuoteData, QuoteRequestData } from '../types/chat';

export interface ConversationScreenProps {
  /** ID del usuario con el que se chatea (el otro participante). */
  userId: string;
  /** ID del chat (opcional, si ya se conoce). */
  chatId?: string;
  /** ID de la solicitud de cotización asociada al chat (opcional). */
  quoteRequestId?: string;
  onGoBack: () => void;
  /** Callback al solicitar cotización (cliente). Recibe chatId y myUserId. */
  onRequestQuote: (chatId: string, myUserId: string) => void;
  /** Callback al completar cotización (trabajador). Recibe quoteRequestId, chatId y myUserId. */
  onCompleteQuote?: (quoteRequestId: string, chatId: string, myUserId: string) => void;
  /** Callback al ver detalle de cotización. */
  onViewQuote?: (quoteRequestId: string, quoteData: QuoteData | null) => void;
  /** Callback cuando se detecta una quote_request pendiente al entrar al chat. */
  onQuoteRequestDetected?: (quoteRequestId: string) => void;
  /** Callback cuando se detecta que la quote_request ya fue completada. */
  onQuoteRequestCompleted?: () => void;
  /** Rol activo del usuario autenticado. */
  role?: UserRole;
  /** Datos de la cotización si ya fue creada (para la píldora de ver). */
  quoteData?: QuoteData | null;
}

/**
 * Pantalla de conversación (Issue #31).
 *
 * Muestra el historial de mensajes, input de texto, adjuntar imágenes con
 * previsualización, indicador de escritura, WebSocket en tiempo real, carga
 * de mensajes anteriores (scroll hacia arriba) y botón "Ir al final".
 *
 * Los mensajes del sistema ("Cotización solicitada", "Cotización recibida",
 * "Cotización completada", mensajes de rechazo) se renderizan como burbujas
 * del sistema centradas dentro del historial de mensajes, con su timestamp
 * correspondiente, respetando el orden cronológico. Llegan en tiempo real
 * vía WebSocket porque se envían como mensajes de chat con
 * message_type = 'QUOTE'.
 *
 * Incluye el botón "Solicitar Cotización" (Issue #34) sobre el área de
 * input, que navega a la pantalla de solicitud de cotización.
 *
 * Para el trabajador, se muestra el botón "Completar Cotización" (Issue #35)
 * que navega a la pantalla de completar cotización.
 *
 * Al entrar al chat, se detecta automáticamente si existe una solicitud de
 * cotización pendiente entre estos dos usuarios, para mostrar el botón
 * correspondiente incluso si el usuario no fue quien la solicitó.
 *
 * Todo el contenido respeta las SafeAreas del sistema (Status Bar arriba,
 * Navigation Bar abajo).
 */
export const ConversationScreen: React.FC<ConversationScreenProps> = ({
  userId,
  chatId: initialChatId,
  onGoBack,
  onRequestQuote,
  onCompleteQuote,
  onViewQuote,
  onQuoteRequestDetected,
  onQuoteRequestCompleted,
  role = 'client',
  quoteData: initialQuoteData,
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

  // Estado para rastrear si hay una solicitud de cotización pendiente
  const [isQuoteRequested, setIsQuoteRequested] = useState(false);
  const [quoteRequestId, setQuoteRequestId] = useState<string | null>(null);
  const [isQuoteCompleted, setIsQuoteCompleted] = useState(false);
  const [_completedQuoteData, setCompletedQuoteData] = useState<QuoteData | null>(
    null,
  );

  // Ref para evitar enviar el mensaje del sistema múltiples veces
  const systemMessageSentRef = useRef<boolean>(false);

  /**
   * Envía un mensaje del sistema al chat (message_type: 'QUOTE').
   * Se envía como un mensaje de chat normal para que llegue por WebSocket
   * a ambos participantes y quede guardado en el historial con su timestamp.
   */
  const sendSystemMessage = useCallback(
    async (content: string) => {
      if (!chatId || !myUserId) return;
      try {
        await chatService.sendMessage(chatId, myUserId, {
          message_type: 'QUOTE',
          content,
        });
        systemMessageSentRef.current = true;
      } catch {
        // Si falla, el mensaje del sistema no se envía pero la UI sigue funcionando.
      }
    },
    [chatId, myUserId],
  );

  /**
   * Verifica si ya existe un mensaje del sistema con el contenido dado
   * en los mensajes cargados del historial.
   */
  const systemMessageExists = useCallback(
    (content: string): boolean => {
      return messages.some(
        (m) => m.message_type === 'QUOTE' && m.content === content,
      );
    },
    [messages],
  );

  // Efecto principal: detectar quote_requests pendientes o completadas
  // Se ejecuta al montar y cada vez que cambian los mensajes (WebSocket)
  useEffect(() => {
    const detectQuoteRequests = async () => {
      if (!myUserId) return;

      try {
        if (role === 'client') {
          const res = await apiClient<{ quote_requests: QuoteRequestData[] }>(
            `/quote-requests/requests/sent`,
            { method: 'GET' },
          );
          const requests = res.quote_requests ?? [];

          // Buscar una solicitud PENDING (para mostrar "Cotización solicitada")
          const pending = requests.find(
            (qr) => qr.status === 'PENDING' && qr.worker_id === userId,
          );
          if (pending) {
            setIsQuoteRequested(true);
            setQuoteRequestId(pending.id);
            setIsQuoteCompleted(false);
            onQuoteRequestDetected?.(pending.id);

            // Enviar mensaje del sistema solo si aún no existe en el historial
            if (!systemMessageSentRef.current && !systemMessageExists('Cotización solicitada')) {
              await sendSystemMessage('Cotización solicitada');
            }
            return;
          }

          // Buscar una solicitud completada (tiene order_id asociado)
          const completed = requests.find(
            (qr) => qr.worker_id === userId && qr.order_id,
          );
          if (completed) {
            setIsQuoteRequested(false);
            setQuoteRequestId(completed.id);
            setIsQuoteCompleted(true);
            onQuoteRequestCompleted?.();
            // Intentar obtener los detalles de la quote
            try {
              const quotesRes = await apiClient<{ quotes: QuoteData[] }>(
                `/orders/${completed.order_id}/quotes`,
                { method: 'GET' },
              );
              const quotes = quotesRes.quotes ?? [];
              if (quotes.length > 0) {
                setCompletedQuoteData(quotes[quotes.length - 1]);
              }
            } catch {
              // Si no se pueden obtener los detalles, se muestra sin datos de quote
            }
          }
        } else if (role === 'worker') {
          const res = await apiClient<{ quote_requests: QuoteRequestData[] }>(
            `/quote-requests/requests/received`,
            { method: 'GET' },
          );
          const requests = res.quote_requests ?? [];

          // Buscar una solicitud PENDING sin order_id (para mostrar "Completar Cotización")
          const pending = requests.find(
            (qr) => qr.status === 'PENDING' && qr.client_id === userId && !qr.order_id,
          );
          if (pending) {
            setIsQuoteRequested(true);
            setQuoteRequestId(pending.id);
            setIsQuoteCompleted(false);
            onQuoteRequestDetected?.(pending.id);
          }

          // Buscar una solicitud ya completada (tiene order_id asociado)
          const completed = requests.find(
            (qr) => qr.client_id === userId && qr.order_id,
          );
          if (completed) {
            setIsQuoteRequested(false);
            setQuoteRequestId(completed.id);
            setIsQuoteCompleted(true);
            // Intentar obtener los detalles de la quote
            try {
              const quotesRes = await apiClient<{ quotes: QuoteData[] }>(
                `/orders/${completed.order_id}/quotes`,
                { method: 'GET' },
              );
              const quotes = quotesRes.quotes ?? [];
              if (quotes.length > 0) {
                setCompletedQuoteData(quotes[quotes.length - 1]);
              }
            } catch {
              // Si no se pueden obtener los detalles, se muestra sin datos de quote
            }
          }
        }
      } catch {
        // Si falla la detección, simplemente no se muestra el botón.
      }
    };

    void detectQuoteRequests();
  }, [
    role,
    userId,
    myUserId,
    chatId,
    messages,
    sendSystemMessage,
    systemMessageExists,
    onQuoteRequestDetected,
    onQuoteRequestCompleted,
  ]);

  // Cuando messages cargue, enviar mensaje del sistema pendiente si corresponde
  useEffect(() => {
    // Este efecto se ejecuta cuando messages cambia (incluye WebSocket)
    // Si hay un mensaje "Cotización completada" en el historial, actualizar estado
    const completedMessage = messages.find(
      (m) => m.message_type === 'QUOTE' && m.content === 'Cotización completada',
    );
    if (completedMessage) {
      setIsQuoteCompleted(true);
      setIsQuoteRequested(false);
      onQuoteRequestCompleted?.();
    }
  }, [messages, onQuoteRequestCompleted]);

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

  const _handleViewQuote = () => {
    if (onViewQuote && quoteRequestId) {
      onViewQuote(quoteRequestId, initialQuoteData ?? null);
    }
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
              typingUserIds.length === 1
                ? otherUser.full_name ?? undefined
                : undefined
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

      {/* Botón "Solicitar Cotización" (cliente) u oculto (trabajador) */}
      {role === 'client' && (
        <QuoteRequestButton
          onPress={() => {
            if (chatId && myUserId) {
              onRequestQuote(chatId, myUserId);
            }
          }}
          role={role}
          quoteRequested={isQuoteRequested}
        />
      )}

      {/* Botón "Completar Cotización" (trabajador, solo si hay solicitud pendiente sin completar) */}
      {role === 'worker' && isQuoteRequested && !isQuoteCompleted && onCompleteQuote && (
        <View style={styles.completeButtonWrapper}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => {
              if (quoteRequestId && chatId && myUserId) {
                onCompleteQuote(quoteRequestId, chatId, myUserId);
              }
            }}
            accessibilityLabel="Completar cotización"
          >
            <Feather
              name="edit"
              size={14}
              color={colors.onPrimary}
              accessible={false}
            />
            <Text style={styles.completeButtonText}>Completar Cotización</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Compositor de mensaje con previsualización de imagen. */}
      <View style={[styles.composerContainer, { paddingBottom: insets.bottom }]}>
        <MessageComposer
          onSendMessage={handleSendMessage}
          onAttachImage={setImagePreview}
          onRemovePreview={removeImagePreview}
          onSendPreviewImage={sendPreviewImage}
          onTyping={setTyping}
          imagePreview={imagePreview}
          isSending={isSending}
        />
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
  },
  completeButtonWrapper: {
    alignSelf: 'center',
    marginVertical: spacing.xs,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.workerAccent,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.workerAccent,
    minWidth: 180,
    maxWidth: '90%',
  },
  completeButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    marginLeft: spacing.xs,
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
