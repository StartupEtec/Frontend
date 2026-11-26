import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme/tokens';

export interface CotizacionFloatingButtonProps {
  /** Color de acento (no se usa visualmente porque está deshabilitado, pero se mantiene por consistencia). */
  accentColor?: string;
  /** Callback al presionar el botón deshabilitado. */
  onPress?: () => void;
  /** Posición superior desde el borde del contenedor padre. */
  top?: number;
  /** Posición derecha desde el borde del contenedor padre. */
  right?: number;
}

/**
 * Botón flotante "Solicitar Cotización".
 *
 * Está deshabilitado (gris) porque la funcionalidad aún no está implementada
 * (Issue #32). Al presionarlo se muestra un alert informativo.
 * Es rectangular con esquinas redondeadas, el ícono está a la izquierda del
 * texto "Cotización" y se posiciona de forma responsiva respecto al contenedor
 * del área de input del mensaje.
 */
export const CotizacionFloatingButton: React.FC<CotizacionFloatingButtonProps> = ({
  accentColor: _accentColor = colors.primary,
  onPress,
  top = spacing.md,
  right = spacing.md,
}) => {
  const handlePress = () => {
    Alert.alert('Próximamente', 'La solicitud de cotizaciones estará disponible próximamente.', [
      { text: 'Aceptar', style: 'default' },
    ]);
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[styles.container, { top, right }]}
      onPress={handlePress}
      testID="btn-cotizacion-flotante"
      accessibilityRole="button"
      accessibilityLabel="Solicitar cotización (próximamente)"
    >
      <Feather name="file-text" size={16} color={colors.textMuted} accessible={false} />
      <Text style={styles.label}>Cotización</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 160,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});
