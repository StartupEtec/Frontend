import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  /** Callback al presionar "(ver)". */
  onViewQuote?: () => void;
}

/**
 * Cartelito "Cotización solicitada" / "Cotización completada" que aparece en
 * el historial de mensajes después de solicitar o completar una cotización.
 *
 * Tiene forma de píldora (esquinas muy redondeadas), color distinto a los
 * mensajes normales y está centrado horizontalmente. Incluye un botón "(ver)"
 * dentro de la misma burbuja para abrir el detalle de la cotización.
 */
export const QuotePill: React.FC<QuotePillProps> = (props) => {
  const {
    text = 'Cotización solicitada',
    quoteRequestId,
    quoteData,
    role,
    onViewQuote,
  } = props;

  // Regla de visibilidad del botón "(ver)":
  // - Cliente: ve "(ver)" solo en "cotización solicitada" (quoteData null, aún no completada)
  // - Trabajador: ve "(ver)" solo en "cotización completada" (quoteData existe)
  const isClientRequest = role === 'client' && !quoteData;
  const isWorkerCompleted = role === 'worker' && Boolean(quoteData);
  const canView = Boolean(quoteRequestId && onViewQuote && (isClientRequest || isWorkerCompleted));

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{text}</Text>
        {canView && (
          <TouchableOpacity
            style={styles.viewButton}
            onPress={onViewQuote}
            accessibilityLabel="Ver cotización"
          >
            <Text style={styles.viewButtonText}>ver</Text>
          </TouchableOpacity>
        )}
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
    gap: spacing.xs,
  },
  pillText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
  viewButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
  },
  viewButtonText: {
    color: colors.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    textDecorationLine: 'underline',
  },
});
