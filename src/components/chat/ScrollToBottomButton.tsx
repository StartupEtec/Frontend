import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';

export interface ScrollToBottomButtonProps {
  /** Función para hacer scroll al final. */
  onScrollToBottom: () => void;
  /** Si está visible el botón. */
  visible?: boolean;
  /** Color de acento. */
  accentColor?: string;
}

/** Botón flotante para ir al final de la conversación. */
export const ScrollToBottomButton: React.FC<ScrollToBottomButtonProps> = ({
  onScrollToBottom,
  visible = false,
  accentColor = colors.primary,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: accentColor }]}
      onPress={onScrollToBottom}
      testID="btn-scroll-to-bottom"
      accessibilityRole="button"
      accessibilityLabel="Ir al final de la conversación"
    >
      <Feather name="chevron-down" size={16} color={colors.onPrimary} accessible={false} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
});
