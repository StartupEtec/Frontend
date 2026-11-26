import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { toDisplayUri } from '../../services/profileService';
import { colors, spacing, typography } from '../../theme/tokens';

export interface ChatHeaderProps {
  /** ID del usuario con el que se chatea (para mostrar su avatar/nombre). */
  otherUser: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  /** Callback al presionar "Volver". */
  onGoBack: () => void;
  /** Color de acento del rol activo. */
  accentColor?: string;
  /** Padding superior extra por Status Bar (safe area insets). */
  insetsTop?: number;
}

/**
 * Encabezado de la conversación en una sola fila:
 *
 * Flecha "Volver" | Avatar + Nombre del otro usuario
 *
 * El título "Chat" se eliminó por no ser necesario. No incluye botón
 * de "Información" (eliminado por ser redundante).
 */
export const ChatHeader: React.FC<ChatHeaderProps> = ({
  otherUser,
  onGoBack,
  accentColor = colors.primary,
  insetsTop = 0,
}) => {
  const avatarUri = otherUser.avatar_url ? toDisplayUri(otherUser.avatar_url) : null;

  return (
    <View style={[styles.root, { paddingTop: spacing.sm + insetsTop }]}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={onGoBack}
          style={styles.backButton}
          testID="btn-conversation-back"
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={[styles.backArrow, { color: accentColor }]}>←</Text>
        </TouchableOpacity>

        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Feather name="user" size={28} color={colors.textMuted} />
          </View>
        )}

        <Text style={styles.name}>{otherUser.full_name ?? 'Trabajador'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backArrow: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarFallback: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});
