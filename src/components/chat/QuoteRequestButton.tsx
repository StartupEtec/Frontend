import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

export interface QuoteRequestButtonProps {
  /** Callback al presionar el botón. */
  onPress: () => void;
  /** Si está deshabilitado (por ejemplo, mientras se envía). */
  disabled?: boolean;
  /** Rol activo del usuario ('client' | 'worker'). */
  role?: 'client' | 'worker';
  /** Si ya se solicitó una cotización (para ocultar/deshabilitar el botón). */
  quoteRequested?: boolean;
}

/**
 * Botón "Solicitar Cotización" que aparece sobre el área de input del chat,
 * centrado horizontalmente. Es pequeño y discreto.
 *
 * Si el rol es 'worker' no se renderiza (el trabajador no solicita cotizaciones).
 * Si el rol es 'client' y ya hay una cotización solicitada, se deshabilita.
 */
export const QuoteRequestButton: React.FC<QuoteRequestButtonProps> = ({
  onPress,
  disabled = false,
  role,
  quoteRequested = false,
}) => {
  // El trabajador no tiene botón "Solicitar Cotización".
  if (role === 'worker') {
    return null;
  }

  const isDisabled = disabled || quoteRequested;

  const handlePress = () => {
    if (isDisabled) return;
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.container, isDisabled && styles.disabled]}
      onPress={handlePress}
      testID="btn-request-quote"
      accessibilityRole="button"
      accessibilityLabel={
        isDisabled ? 'Solicitar cotización (deshabilitada)' : 'Solicitar cotización'
      }
    >
      <Feather
        name="file-text"
        size={14}
        color={isDisabled ? colors.textMuted : colors.primary}
        accessible={false}
      />
      <Text style={[styles.label, isDisabled && styles.disabledLabel]}>Solicitar Cotización</Text>
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
