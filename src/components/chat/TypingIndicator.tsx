import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';

export interface TypingIndicatorProps {
  /** Lista de IDs de usuarios que están escribiendo. */
  typingUserIds: string[];
  /** Nombre del usuario que está escribiendo (si hay uno solo). */
  typingUserName?: string;
}

/** Indicador de "escribiendo..." con animación de puntos suspensivos. */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUserIds,
  typingUserName,
}) => {
  if (!typingUserIds || typingUserIds.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.typingText}>
        {typingUserName}
        {typingUserIds.length > 1 ? ' y otro usuario' : ''} está escribiendo
        <Text style={styles.dot}>.</Text>
        <Text style={styles.dot}>.</Text>
        <Text style={styles.dot}>.</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs / 2,
  },
  typingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  dot: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
});
