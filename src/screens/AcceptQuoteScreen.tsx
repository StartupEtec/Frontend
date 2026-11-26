import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme/tokens';
import { quoteService } from '../services/quoteService';
import { chatService } from '../services/chatService';
import { QuoteData, QuoteRequestData } from '../types/chat';

export interface AcceptQuoteScreenProps {
  /** ID de la solicitud de cotización recibida. */
  quoteRequestId: string;
  /** ID del chat donde se enviará el mensaje de rechazo/confirmación. */
  chatId: string;
  /** ID del usuario cliente autenticado. */
  myUserId: string;
  /** Callback al volver al chat sin hacer cambios. */
  onClose: () => void;
  /** Callback al rechazar al menos un campo de la cotización. */
  onRejected: (fields: string[]) => void;
  /** Callback al confirmar la cotización (luego envía a la pantalla de Pago). */
  onCompleted: (quote: QuoteData) => void;
}

/**
 * Pantalla "Confirmar Cotización" (Issue #36).
 *
 * Dos páginas:
 * 1. Revisar fecha, hora y precio propuestos por el trabajador, aprobando
 *    o rechazando cada campo. Si hay al menos un rechazo, el botón "Siguiente"
 *    se pone en rojo y dice "Rechazar", enviando un mensaje del sistema.
 * 2. Resumen de los 6 datos de la cotización (categoría, ubicación,
 *    descripción, fecha, hora y precio) con "Volver" y "Pagar".
 *    Al pagar se envía el mensaje del sistema "Cotización confirmada".
 */
export const AcceptQuoteScreen: React.FC<AcceptQuoteScreenProps> = ({
  quoteRequestId,
  chatId,
  myUserId,
  onClose,
  onRejected,
  onCompleted,
}) => {
  const [page, setPage] = useState<1 | 2>(1);
  const [quoteRequest, setQuoteRequest] = useState<QuoteRequestData | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [approvedDate, setApprovedDate] = useState(true);
  const [approvedTime, setApprovedTime] = useState(true);
  const [approvedPrice, setApprovedPrice] = useState(true);

  // Cargar la solicitud y la cotización (fecha, hora, precio) al montar.
  useEffect(() => {
    const loadQuote = async () => {
      try {
        const qr = await quoteService.getQuoteRequest(quoteRequestId);
        setQuoteRequest(qr);
        if (qr.order_id) {
          try {
            const quotes = await quoteService.listQuotesByOrder(qr.order_id);
            if (quotes.length > 0) {
              setQuoteData(quotes[quotes.length - 1]);
            }
          } catch {
            // Si no se pueden obtener los detalles, se muestra "No disponible"
          }
        }
      } catch {
        Alert.alert('Error', 'No se pudo cargar la cotización');
      } finally {
        setLoading(false);
      }
    };
    void loadQuote();
  }, [quoteRequestId]);

  const rejectedFields: string[] = [];
  if (!approvedDate) rejectedFields.push('fecha');
  if (!approvedTime) rejectedFields.push('hora');
  if (!approvedPrice) rejectedFields.push('precio');
  const hasRejections = rejectedFields.length > 0;
  const allFieldsApproved = approvedDate && approvedTime && approvedPrice;

  const handleToggleDate = () => setApprovedDate((prev) => !prev);
  const handleToggleTime = () => setApprovedTime((prev) => !prev);
  const handleTogglePrice = () => setApprovedPrice((prev) => !prev);

  const buildRejectionMessage = (fields: string[]): string => {
    const campos = fields.join(', ');
    return `La cotización fue rechazada por el/los campo/s: ${campos}`;
  };

  const handleRejectQuote = async () => {
    setIsCreating(true);
    try {
      await quoteService.updateQuoteRequestStatus(quoteRequestId, {
        status: 'REJECTED',
        rejection_reason: `Campos rechazados: ${rejectedFields.join(', ')}`,
      });

      await chatService.sendMessage(chatId, myUserId, {
        message_type: 'QUOTE',
        content: buildRejectionMessage(rejectedFields),
      });

      onRejected(rejectedFields);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al rechazar la solicitud';
      Alert.alert('Error', message);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePage1Next = async () => {
    if (hasRejections) {
      await handleRejectQuote();
      return;
    }
    if (!allFieldsApproved) {
      Alert.alert('Revisar solicitud', 'Debe aprobar la fecha, hora y precio antes de continuar.', [
        { text: 'Aceptar', style: 'default' },
      ]);
      return;
    }
    setPage(2);
  };

  const handlePage2Pay = async () => {
    if (!quoteData) {
      Alert.alert('Error', 'No se encontró la cotización a pagar');
      return;
    }
    setIsCreating(true);
    try {
      // Aceptamos la solicitud y enviamos el mensaje del sistema
      // "Cotización confirmada" con su botón "(ver)".
      await quoteService.updateQuoteRequestStatus(quoteRequestId, { status: 'ACCEPTED' });
      await chatService.sendMessage(chatId, myUserId, {
        message_type: 'QUOTE',
        content: 'Cotización confirmada',
      });
      onCompleted(quoteData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al confirmar la cotización';
      Alert.alert('Error', message);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando cotización...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!quoteRequest || !quoteData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se encontró la cotización</Text>
          <TouchableOpacity style={styles.errorButton} onPress={onClose}>
            <Text style={styles.errorButtonText}>Volver al chat</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar />
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Feather name="x" size={20} color={colors.textMuted} accessible={false} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {page === 1 ? 'Revisar Cotización' : 'Resumen de Cotización'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {page === 1 ? (
          <>
            <Text style={styles.pageHint}>
              Revisá los datos propuestos por el trabajador. Aprobá o rechazá cada uno.
            </Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Fecha de la visita</Text>
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>{quoteData.proposed_date}</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, approvedDate && styles.toggleActive]}
                  onPress={handleToggleDate}
                  accessibilityLabel={approvedDate ? 'Rechazar fecha' : 'Aprobar fecha'}
                >
                  <Feather
                    name={approvedDate ? 'check-circle' : 'circle'}
                    size={20}
                    color={approvedDate ? colors.success : colors.textMuted}
                    accessible={false}
                  />
                </TouchableOpacity>
              </View>
              {!approvedDate && <Text style={styles.fieldRejected}>Rechazado</Text>}
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hora de la visita</Text>
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>{quoteData.proposed_time}</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, approvedTime && styles.toggleActive]}
                  onPress={handleToggleTime}
                  accessibilityLabel={approvedTime ? 'Rechazar hora' : 'Aprobar hora'}
                >
                  <Feather
                    name={approvedTime ? 'check-circle' : 'circle'}
                    size={20}
                    color={approvedTime ? colors.success : colors.textMuted}
                    accessible={false}
                  />
                </TouchableOpacity>
              </View>
              {!approvedTime && <Text style={styles.fieldRejected}>Rechazado</Text>}
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Precio propuesto</Text>
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>
                  ${Number(quoteData.proposed_price || 0).toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={[styles.toggleButton, approvedPrice && styles.toggleActive]}
                  onPress={handleTogglePrice}
                  accessibilityLabel={approvedPrice ? 'Rechazar precio' : 'Aprobar precio'}
                >
                  <Feather
                    name={approvedPrice ? 'check-circle' : 'circle'}
                    size={20}
                    color={approvedPrice ? colors.success : colors.textMuted}
                    accessible={false}
                  />
                </TouchableOpacity>
              </View>
              {!approvedPrice && <Text style={styles.fieldRejected}>Rechazado</Text>}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.pageHint}>Resumen de la cotización:</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Categoría del servicio</Text>
              <Text style={styles.valueText}>{quoteRequest.category}</Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ubicación del servicio</Text>
              <Text style={styles.valueText}>{quoteRequest.location}</Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Descripción del trabajo</Text>
              <Text style={styles.descriptionText}>
                {quoteRequest.description ?? 'Sin descripción'}
              </Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Fecha propuesta</Text>
              <Text style={styles.valueText}>{quoteData.proposed_date}</Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hora propuesta</Text>
              <Text style={styles.valueText}>{quoteData.proposed_time}</Text>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Precio propuesto</Text>
              <Text style={styles.valueText}>
                ${Number(quoteData.proposed_price || 0).toFixed(2)}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
      {/* Pie con los dos botones, abajo a la derecha */}
      <View style={styles.footer}>
        {page === 1 ? (
          <>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              disabled={isCreating}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                hasRejections ? styles.primaryButtonRejected : null,
                isCreating ? styles.primaryButtonDisabled : null,
              ]}
              onPress={handlePage1Next}
              disabled={isCreating}
            >
              <Text style={styles.primaryButtonText}>
                {hasRejections ? 'Rechazar' : 'Siguiente'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setPage(1)}
              disabled={isCreating}
            >
              <Text style={styles.secondaryButtonText}>Volver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, isCreating ? styles.primaryButtonDisabled : null]}
              onPress={handlePage2Pay}
              disabled={isCreating}
            >
              <Text style={styles.primaryButtonText}>{isCreating ? 'Procesando...' : 'Pagar'}</Text>
            </TouchableOpacity>
          </>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  errorButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  closeButton: {
    padding: spacing.xs,
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
  headerSpacer: { width: 40 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  pageHint: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.xs,
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
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  valueText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    flex: 1,
  },
  toggleButton: {
    padding: spacing.xs,
  },
  toggleActive: {
    backgroundColor: colors.successContainer,
    borderRadius: borderRadius.md,
  },
  fieldRejected: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs / 2,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
  },
  secondaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryButtonRejected: {
    backgroundColor: colors.error,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default AcceptQuoteScreen;
