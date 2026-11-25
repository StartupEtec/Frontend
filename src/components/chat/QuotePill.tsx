import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

export interface QuotePillProps {
  /** Texto a mostrar en la píldora. */
  text?: string;
}

/**
 * Cartelito "Cotización solicitada" que aparece en el historial de mensajes
 * después de solicitar una cotización desde el chat.
 *
 * Tiene forma de píldora (esquinas muy redondeadas), color distinto a los
 * mensajes normales y está centrado horizontalmente.
 */
export const QuotePill: React.FC<QuotePillProps> = ({ text = 'Cotización solicitada' }) => {
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
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: '90%',
    minWidth: 200,
  },
  pillText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
});
