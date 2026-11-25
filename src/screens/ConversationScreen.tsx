import React, { useEffect, useState } from 'react';
import { StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { apiClient } from '../services/api';
import { UserRole } from '../types/role';
import { colors, spacing, borderRadius, typography, roleAccent } from '../theme/tokens';
import { useConversation } from '../hooks/useConversation';
import { ChatHeader } from '../components/chat/ChatHeader';
import { MessageList } from '../components/chat/MessageList';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { MessageComposer } from '../components/chat/MessageComposer';
import { QuoteRequestButton } from '../components/chat/QuoteRequestButton';
import { QuotePill } from '../components/chat/QuotePill';
import { QuoteData, QuoteRequestData } from '../types/chat';

export interface ConversationScreenProps {
  /** ID del usuario con el que se chatea (el otro participante). */
  userId: string;
  /** ID del chat (opcional, si ya se conoce). */
  chatId?: string;
  /** ID de la solicitud de cotización asociada al chat (opcional). */
  quoteRequestId?: string;
  onGoBack: () => void;
  /** Callback al solicitar cotización (cliente). */
  onRequestQuote: () => void;
  /** Callback al completar cotización (trabajador). Recibe quoteRequestId, chatId y myUserId. */
  onCompleteQuote?: (quoteRequestId: string, chatId: string, myUserId: string) => void;
  /** Callback al ver detalle de cotización. */
  onViewQuote?: (quoteRequestId: string, quoteData: QuoteData | null) => void;
  /** Callback cuando se detecta una quote_request pendiente al entrar al chat. */
  onQuoteRequestDetected?: (quoteRequestId: string) => void;
  /** Si ya se solicitó una cotización (para mostrar la píldora). */
  quoteRequested?: boolean;
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
 * Incluye el botón "Solicitar Cotización" (Issue #34) sobre el área de
 * input, que navega a la pantalla de solicitud de cotización. Una vez
 * enviada, se muestra una píldora "Cotización solicitada" en el historial.
 *
 * Para el trabajador, se muestra el botón "Completar Cotización" (Issue #35)
 * que navega a la pantalla de completar cotización.
 *
 * Al entrar al chat, se detecta automáticamente si existe una solicitud de
 * cotización pendiente entre estos dos usuarios, para mostrar la píldora y
 * el botón correspondiente incluso si el usuario no fue quien la solicitó.
 *
 * Todo el contenido respeta las SafeAreas del sistema (Status Bar arriba,
 * Navigation Bar abajo).
 */
export const ConversationScreen: React.FC<ConversationScreenProps> = ({
  userId,
  chatId: initialChatId,
  quoteRequestId: initialQuoteRequestId,
  onGoBack,
  onRequestQuote,
  onCompleteQuote,
  onViewQuote,
  onQuoteRequestDetected,
  quoteRequested: initialQuoteRequested = false,
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

  // Estado local para detectar quote_requests pendientes al entrar al chat.
  const [detectedQuoteRequested, setDetectedQuoteRequested] = useState<boolean>(
    initialQuoteRequested,
  );
  const [detectedQuoteRequestId, setDetectedQuoteRequestId] = useState<string | undefined>(
    initialQuoteRequestId,
  );

  // Al entrar al chat, detectar si existe una solicitud de cotización pendiente
  // entre estos dos usuarios. Esto permite que el trabajador vea el bubble y
  // el botón "Completar cotización" aunque no haya sido quien la solicitó.
  useEffect(() => {
    const detectPendingQuoteRequest = async () => {
      if (detectedQuoteRequested || !myUserId) return;

      try {
        if (role === 'client') {
          const res = await apiClient<{ quote_requests: QuoteRequestData[] }>(
            `/quote-requests/requests/sent`,
            { method: 'GET' },
          );
          const pending = (res.quote_requests ?? []).find(
            (qr) => qr.status === 'PENDING' && qr.worker_id === userId,
          );
          if (pending) {
            setDetectedQuoteRequested(true);
            setDetectedQuoteRequestId(pending.id);
            onQuoteRequestDetected?.(pending.id);
          }
        } else if (role === 'worker') {
          const res = await apiClient<{ quote_requests: QuoteRequestData[] }>(
            `/quote-requests/requests/received`,
            { method: 'GET' },
          );
          const pending = (res.quote_requests ?? []).find(
            (qr) => qr.status === 'PENDING' && qr.client_id === userId,
          );
          if (pending) {
            setDetectedQuoteRequested(true);
            setDetectedQuoteRequestId(pending.id);
            onQuoteRequestDetected?.(pending.id);
          }
        }
      } catch {
        // Si falla la detección, simplemente no se muestra el bubble/botón.
      }
    };

    void detectPendingQuoteRequest();
  }, [role, userId, myUserId, detectedQuoteRequested, onQuoteRequestDetected]);

  // Valores efectivos: estado local detectado tiene prioridad sobre los props
  // iniciales (que vienen de AppNavigator).
  const effectiveQuoteRequested = detectedQuoteRequested || initialQuoteRequested;
  const effectiveQuoteRequestId = detectedQuoteRequestId ?? initialQuoteRequestId;

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

  const handleViewQuote = () => {
    if (onViewQuote && effectiveQuoteRequestId) {
      onViewQuote(effectiveQuoteRequestId, initialQuoteData ?? null);
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
        footerContent={
          effectiveQuoteRequested ? (
            <View style={styles.pillWrapper}>
              <QuotePill
                text={
                  role === 'worker'
                    ? initialQuoteData
                      ? 'Cotización completada'
                      : 'Cotización recibida'
                    : 'Cotización solicitada'
                }
                quoteRequestId={effectiveQuoteRequestId}
                quoteData={initialQuoteData ?? null}
                role={role}
                onViewQuote={handleViewQuote}
              />
            </View>
          ) : undefined
        }
      />

      {/* Botón "Solicitar Cotización" (cliente) u oculto (trabajador) */}
      {role === 'client' && (
        <QuoteRequestButton
          onPress={onRequestQuote}
          role={role}
          quoteRequested={effectiveQuoteRequested}
        />
      )}

      {/* Botón "Completar Cotización" (trabajador, solo si hay solicitud pendiente) */}
      {role === 'worker' && effectiveQuoteRequested && onCompleteQuote && (
        <View style={styles.completeButtonWrapper}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => {
              if (effectiveQuoteRequestId && chatId && myUserId) {
                onCompleteQuote(effectiveQuoteRequestId, chatId, myUserId);
              }
            }}
            accessibilityLabel="Completar cotización"
          >
            <Feather name="edit" size={14} color={colors.onPrimary} accessible={false} />
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
  pillWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: spacing.xs,
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
