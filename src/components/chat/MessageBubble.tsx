import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChatMessage } from '../../types/chat';
import { toDisplayUri } from '../../services/profileService';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

export interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  /** Si el mensaje es del sistema (message_type === 'QUOTE'). */
  isSystem?: boolean;
  accentColor?: string;
  /** Callback al presionar "(ver)" en un mensaje del sistema de cotización. */
  onViewQuote?: () => void;
}

/** Contenidos de mensaje del sistema que muestran el botón "(ver)". */
const VIEWABLE_CONTENTS = [
  'Cotización solicitada',
  'Cotización completada',
  'Cotización confirmada',
];

/**
 * Burbuja individual de un mensaje en la conversación.
 *
 * Soporta tres tipos de renderizado:
 * - Mensaje normal del usuario (isSystem = false): burbuja a la izquierda o derecha
 *   según sea propio o ajeno.
 * - Mensaje del sistema (isSystem = true): burbuja centrada con estilo de píldora,
 *   color azul (primaryContainer), usada para "Cotización solicitada", "Cotización
 *   completada" y mensajes de rechazo.
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  isSystem = false,
  accentColor: _accentColor,
  onViewQuote,
}) => {
  const { content, message_type, created_at } = message;
  const isImage = message_type === 'IMAGE';
  const time = created_at ? new Date(created_at) : null;
  const timeLabel = time
    ? time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : '';

  // Mensaje del sistema: burbuja centrada con estilo de píldora
  if (isSystem) {
    const showViewButton = !!onViewQuote && !!content && VIEWABLE_CONTENTS.includes(content);
    return (
      <View style={styles.systemContainer}>
        <View style={styles.systemBubble}>
          {isImage && message.attachment_url && (
            <Image
              source={{ uri: toDisplayUri(message.attachment_url) }}
              style={styles.imageBubble}
            />
          )}
          {!isImage && content && <Text style={styles.systemMessageText}>{content}</Text>}
          {showViewButton && (
            <TouchableOpacity
              onPress={onViewQuote}
              style={styles.viewButton}
              testID="btn-view-quote"
              accessibilityRole="button"
              accessibilityLabel="Ver cotización"
            >
              <Text style={styles.viewButtonText}>(ver)</Text>
            </TouchableOpacity>
          )}
          {timeLabel && <Text style={styles.systemTimeText}>{timeLabel}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isOwn ? styles.own : styles.other]}>
      <View style={[styles.bubbleContainer, isOwn ? styles.ownBubble : styles.otherBubble]}>
        {isImage && message.attachment_url && (
          <Image
            source={{ uri: toDisplayUri(message.attachment_url) }}
            style={styles.imageBubble}
          />
        )}
        {!isImage && content && (
          <Text
            style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}
          >
            {content}
          </Text>
        )}
        {timeLabel && (
          <Text style={[styles.timeText, isOwn ? styles.ownTimeText : styles.otherTimeText]}>
            {timeLabel}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs / 2,
  },
  own: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  other: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bubbleContainer: {
    maxWidth: '85%',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs / 2,
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 0,
  },
  otherBubble: {
    backgroundColor: colors.surfaceContainerLow,
    borderTopLeftRadius: 0,
  },
  messageText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.regular,
  },
  ownMessageText: {
    color: colors.onPrimary,
  },
  otherMessageText: {
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs / 4,
    textAlign: 'right',
  },
  ownTimeText: {
    color: colors.textMuted,
  },
  otherTimeText: {
    color: colors.textMuted,
  },
  imageBubble: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.md,
  },
  // Mensaje del sistema: burbuja centrada estilo píldora
  systemContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  systemBubble: {
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: 'center',
    maxWidth: '90%',
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  systemMessageText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
  viewButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.primary,
  },
  viewButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  systemTimeText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs / 4,
    textAlign: 'center',
  },
});
