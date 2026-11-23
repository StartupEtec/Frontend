import React from 'react';
import { Image, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ChatListItem } from '../../types/chat';
import { toDisplayUri } from '../../services/profileService';
import { colors, spacing, typography } from '../../theme/tokens';

export interface ChatListItemProps {
  chat: ChatListItem;
  onPress: (chatId: string) => void;
  accentColor?: string;
}

/** Fila individual de la lista de chats (estilo WhatsApp). */
export const ChatListItem: React.FC<ChatListItemProps> = ({
  chat,
  onPress,
  accentColor = colors.primary,
}) => {
  const { other_user, last_message, unread_count, last_message_at } = chat;
  const avatarUri = toDisplayUri(other_user.avatar_url);
  const time = last_message_at ? new Date(last_message_at) : null;
  const timeLabel = time
    ? time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(chat.chat_id)}
      testID={`chat-item-${chat.chat_id}`}
      accessibilityRole="button"
      accessibilityLabel={`Conversación con ${other_user.full_name ?? 'usuario'}`}
    >
      <View style={styles.avatarContainer}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Feather name="user" size={24} color={colors.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{other_user.full_name ?? 'Usuario'}</Text>
          {timeLabel && <Text style={styles.time}>{timeLabel}</Text>}
        </View>
        <View style={styles.previewRow}>
          {last_message ? (
            <>
              <Text style={styles.previewText}>{last_message.text}</Text>
              {!last_message.read && <Text style={styles.previewTime}>{timeLabel}</Text>}
            </>
          ) : (
            <Text style={styles.previewEmpty}>Sin mensajes</Text>
          )}
        </View>
        {unread_count > 0 && (
          <View style={[styles.badge, { backgroundColor: accentColor }]}>
            <Text style={styles.badgeText}>{unread_count}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    marginRight: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  time: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginLeft: spacing.xs,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: '400',
    flex: 1,
    marginRight: spacing.xs,
    maxWidth: '80%',
  },
  previewTime: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  previewEmpty: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    fontStyle: 'italic',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
});
