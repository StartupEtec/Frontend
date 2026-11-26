import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/tokens';
import { quoteService } from '../services/quoteService';
import { QuoteData, QuoteRequestData } from '../types/chat';

export interface QuoteViewScreenProps {
  /** ID de la solicitud de cotización. */
  quoteRequestId: string;
  /** Datos de la cotización (solo si el trabajador ya completó). */
  quoteData: QuoteData | null;
  /** Rol activo del usuario. */
  role: 'client' | 'worker';
  /** Callback al cerrar la pantalla. */
  onClose: () => void;
}

/**
 * Pantalla "Ver Cotización" (Issue #35).
 *
 * Muestra los detalles de la cotización según el rol del usuario:
 * - Cliente: categoría, ubicación y descripción de la solicitud.
 * - Trabajador: fecha, hora y precio propuestos en la cotización.
 *
 * No es un modal: es una pantalla independiente navegada desde el chat.
 */
export const QuoteViewScreen: React.FC<QuoteViewScreenProps> = ({
  quoteRequestId,
  quoteData,
  role,
  onClose,
}) => {
  const [quoteRequest, setQuoteRequest] = useState<QuoteRequestData | null>(null);
  const [localQuoteData, setLocalQuoteData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  // Datos efectivos: los recibidos por props tienen prioridad.
  const effectiveQuoteData = quoteData ?? localQuoteData;

  useEffect(() => {
    const loadQuoteRequest = async () => {
      try {
        const qr = await quoteService.getQuoteRequest(quoteRequestId);
        setQuoteRequest(qr);
        // Si no se recibieron los datos de la cotización (fecha, hora, precio),
        // intentar obtenerlos desde la orden asociada a la solicitud.
        if (!quoteData && qr.order_id) {
          try {
            const quotes = await quoteService.listQuotesByOrder(qr.order_id);
            if (quotes.length > 0) {
              setLocalQuoteData(quotes[quotes.length - 1]);
            }
          } catch {
            // Sin datos de quote: se muestra el estado vacío correspondiente
          }
        }
      } catch {
        Alert.alert('Error', 'No se pudo cargar el detalle de la cotización');
      } finally {
        setLoading(false);
      }
    };
    loadQuoteRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteRequestId]);

  const handleDeleteQuoteRequest = async () => {
    await Alert.alert(
      'Eliminar cotización',
      '¿Estás seguro de que quieres eliminar esta solicitud de cotización?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await quoteService.removeQuoteRequest(quoteRequestId);
              onClose();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la solicitud de cotización');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // El cliente puede eliminar solo si la cotización no fue completada (quoteData null)
  const canDelete = role === 'client' && !effectiveQuoteData;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando detalle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar />

      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Feather name="x" size={20} color={colors.textMuted} accessible={false} />
        </TouchableOpacity>
        <Text style={styles.title}>Detalle de Cotización</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Cuerpo scrollable */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {role === 'client' ? (
          <>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Categoría del servicio</Text>
              <Text style={styles.valueText}>{quoteRequest?.category ?? 'No disponible'}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ubicación del servicio</Text>
              <Text style={styles.valueText}>{quoteRequest?.location ?? 'No disponible'}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Descripción del trabajo</Text>
              <Text style={styles.descriptionText}>
                {quoteRequest?.description ?? 'Sin descripción'}
              </Text>
            </View>
          </>
        ) : (
          <>
            {effectiveQuoteData ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Fecha propuesta</Text>
                  <Text style={styles.valueText}>{effectiveQuoteData.proposed_date}</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Hora propuesta</Text>
                  <Text style={styles.valueText}>{effectiveQuoteData.proposed_time}</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Precio propuesto</Text>
                  <Text style={styles.priceText}>
                    ${Number(effectiveQuoteData.proposed_price).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Estado</Text>
                  <Text style={styles.statusText}>{effectiveQuoteData.status}</Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Feather
                  name="message-circle"
                  size={48}
                  color={colors.textMuted}
                  accessible={false}
                />
                <Text style={styles.emptyText}>
                  El trabajador aún no ha completado la cotización.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Pie */}
      <View style={styles.footer}>
        {canDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteQuoteRequest}
            disabled={isDeleting}
          >
            <Feather name="trash-2" size={16} color={colors.error} accessible={false} />
            <Text style={styles.deleteButtonText}>
              {isDeleting ? 'Eliminando...' : 'Eliminar cotización'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Volver al chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  headerSpacer: { width: 40 },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
  valueText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  descriptionText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  priceText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
  },
  closeButtonText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorContainer,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default QuoteViewScreen;
