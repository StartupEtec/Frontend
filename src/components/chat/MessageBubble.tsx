import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ChatMessage } from '../../types/chat';
import { toDisplayUri } from '../../services/profileService';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

export interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  accentColor?: string;
}

/** Burbuja individual de un mensaje en la conversación. */
export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const { content, message_type, created_at } = message;
  const isImage = message_type === 'IMAGE';
  const time = created_at ? new Date(created_at) : null;
  const timeLabel = time
    ? time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : '';

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
});
