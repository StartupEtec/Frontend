import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';
import { QuoteData } from '../../types/chat';

export interface QuotePillProps {
  /** Texto a mostrar en la píldora. */
  text?: string;
  /** ID de la solicitud de cotización (para navegar a la pantalla de detalle). */
  quoteRequestId?: string;
  /** Datos de la cotización (si ya fue completada). */
  quoteData?: QuoteData | null;
  /** Rol activo del usuario. */
  role?: 'client' | 'worker';
}

/**
 * Cartelito "Cotización solicitada" / "Cotización completada" que aparece en
 * el historial de mensajes después de solicitar o completar una cotización.
 *
 * Tiene forma de píldora (esquinas muy redondeadas), color distinto a los
 * mensajes normales y está centrado horizontalmente.
 */
export const QuotePill: React.FC<QuotePillProps> = (props) => {
  const { text = 'Cotización solicitada' } = props;

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  pill: {
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: 'center',
    maxWidth: '90%',
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
});
