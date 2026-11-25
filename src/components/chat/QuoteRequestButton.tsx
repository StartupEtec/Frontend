import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

export interface QuoteRequestButtonProps {
  /** Callback al presionar el botón. */
  onPress: () => void;
  /** Si está deshabilitado (por ejemplo, mientras se envía). */
  disabled?: boolean;
}

/**
 * Botón "Solicitar Cotización" que aparece sobre el área de input del chat,
 * centrado horizontalmente. Es pequeño y discreto.
 */
export const QuoteRequestButton: React.FC<QuoteRequestButtonProps> = ({
  onPress,
  disabled = false,
}) => {
  const handlePress = () => {
    if (disabled) return;
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      onPress={handlePress}
      testID="btn-request-quote"
      accessibilityRole="button"
      accessibilityLabel={
        disabled ? 'Solicitar cotización (deshabilitado)' : 'Solicitar cotización'
      }
    >
      <Feather
        name="file-text"
        size={14}
        color={disabled ? colors.textMuted : colors.primary}
        accessible={false}
      />
      <Text style={[styles.label, disabled && styles.disabledLabel]}>Solicitar Cotización</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    marginVertical: spacing.xs,
    minWidth: 160,
    maxWidth: '90%',
    alignSelf: 'center',
  },
  disabled: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.textMuted,
  },
  label: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    marginLeft: spacing.xs,
  },
  disabledLabel: {
    color: colors.textMuted,
  },
});
