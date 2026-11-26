import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
  /** ID del chat donde se enviará el mensaje de rechazo. */
  chatId: string;
  /** ID del usuario cliente autenticado. */
  myUserId: string;
  /** Callback al volver al chat sin hacer cambios. */
  onClose: () => void;
  /** Callback al rechazar categoría o ubicación. */
  onRejected: (fields: string[]) => void;
  /** Callback al completar la cotización exitosamente. */
  onCompleted: (quote: QuoteData) => void;
}

/**
 * Pantalla "Completar Cotización" para el cliente (Issue #36).
 *
 * Tiene dos páginas:
 * 1) Revisar y aprobar/rechazar fecha, hora y precio propuestos por el
 *    trabajador. Los campos empiezan aprobados por defecto. Si se rechazan,
 *    el botón cambia a "Rechazar" (fondo rojo) y al confirmar se envía un
 *    mensaje al chat con los campos rechazados.
 * 2) Resumen con categoría, ubicación, descripción, fecha, hora y precio.
 *    Botones: "Volver" y "Pagar".
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

  // Página 1: aprobación de campos. Empiezan aprobados por defecto.
  const [approvedDate, setApprovedDate] = useState(true);
  const [approvedTime, setApprovedTime] = useState(true);
  const [approvedPrice, setApprovedPrice] = useState(true);

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
    const rejectionReason = `Campos rechazados: ${rejectedFields.join(', ')}`;

    try {
      // Actualizar estado de la solicitud a REJECTED en el backend.
      await apiClient<{ quote_request: QuoteRequestData }>(
        `/quote-requests/requests/${quoteRequestId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'REJECTED', rejection_reason: rejectionReason }),
        }
      );

      // Enviar mensaje al chat notificando el rechazo (como mensaje del sistema).
      await chatService.sendMessage(chatId, myUserId, {
        message_type: 'QUOTE',
        content: buildRejectionMessage(rejectedFields),
      });

      // Notificar al cliente que fue rechazado y navegar de vuelta.
      onRejected(rejectedFields);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al rechazar la solicitud';
      Alert.alert('Error', message);
    }
  };

  const handlePage1Next = async () => {
    if (hasRejections) {
      // Si hay rechazos, enviar el rechazo y volver al chat.
      await handleRejectQuote();
      return;
    }
    if (!allFieldsApproved) {
      Alert.alert(
        'Revisar solicitud',
        'Debe aprobar la fecha, hora y precio antes de continuar.',
        [{ text: 'Aceptar', style: 'default' }]
      );
      return;
    }
    setPage(2);
  };

  const handlePage1Cancel = () => {
    onClose();
  };

  // --- Página 2 ---

  const handlePage2Back = () => {
    setPage(1);
  };

  const handlePage2Pay = async () => {
    onCompleted(quoteData as QuoteData);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando solicitud...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!quoteRequest) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se encontró la solicitud de cotización</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Volver al chat</Text>
          </TouchableOpacity>
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
        <Text style={styles.title}>
          {page === 1 ? 'Revisar Cotización' : 'Resumen de Cotización'}
        </Text>
        {page === 2 && (
          <TouchableOpacity onPress={handlePage2Back} style={styles.backButton}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cuerpo scrollable */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {page === 1 ? (
          <>
            {/* Fecha */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Fecha de la visita</Text>
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>{quoteData?.proposed_date ?? 'No disponible'}</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, approvedDate && styles.toggleActive]}
                  onPress={handleToggleDate}
                >
                  <Feather
                    name={approvedDate ? 'check-circle' : 'circle'}
                    size={20}
                    color={approvedDate ? colors.success : colors.textMuted}
                    accessible={false}
                  />
                </TouchableOpacity>
              </View>
              {!approvedDate && rejectedFields.includes('fecha') && (
                <Text style={styles.fieldRejected}>Rechazado</Text>
              )}
            </View>

            {/* Hora */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hora de la visita</Text>
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>{quoteData?.proposed_time ?? 'No disponible'}</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, approvedTime && styles.toggleActive]}
                  onPress={handleToggleTime}
                >
                  <Feather
                    name={approvedTime ? 'check-circle' : 'circle'}
                    size={20}
                    color={approvedTime ? colors.success : colors.textMuted}
                    accessible={false}
                  />
                </TouchableOpacity>
              </View>
              {!approvedTime && rejectedFields.includes('hora') && (
                <Text style={styles.fieldRejected}>Rechazado</Text>
              )}
            </View>

            {/* Precio */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Precio propuesto</Text>
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>
                  ${Number(quoteData?.proposed_price || 0).toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={[styles.toggleButton, approvedPrice && styles.toggleActive]}
                  onPress={handleTogglePrice}
                >
                  <Feather
                    name={approvedPrice ? 'check-circle' : 'circle'}
                    size={20}
                    color={approvedPrice ? colors.success : colors.textMuted}
                    accessible={false}
                  />
                </TouchableOpacity>
              </View>
              {!approvedPrice && rejectedFields.includes('precio') && (
                <Text style={styles.fieldRejected}>Rechazado</Text>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Categoría */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Categoría del servicio</Text>
              <Text style={styles.valueText}>{quoteRequest.category}</Text>
            </View>

            {/* Ubicación */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ubicación del servicio</Text>
              <Text style={styles.valueText}>{quoteRequest.location}</Text>
            </View>

            {/* Descripción */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Descripción del trabajo</Text>
              <Text style={styles.descriptionText}>
                {quoteRequest.description ?? 'Sin descripción'}
              </Text>
            </View>

            {/* Fecha */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Fecha propuesta</Text>
              <Text style={styles.valueText}>{quoteData?.proposed_date}</Text>
            </View>

            {/* Hora */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hora propuesta</Text>
              <Text style={styles.valueText}>{quoteData?.proposed_time}</Text>
            </View>

            {/* Precio */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Precio propuesto</Text>
              <Text style={styles.valueText}>
                ${Number(quoteData?.proposed_price || 0).toFixed(2)}
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Pie con botones */}
      <View style={styles.footer}>
        {page === 1 ? (
          <>
            <TouchableOpacity style={styles.cancelButton} onPress={handlePage1Cancel}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.nextButton,
                hasRejections && styles.nextButtonRejected,
                !allFieldsApproved && styles.nextButtonDisabled,
              ]}
              onPress={handlePage1Next}
              disabled={!allFieldsApproved && !hasRejections}
            >
              <Text style={[styles.nextButtonText, hasRejections && styles.nextButtonRejectedText]}>
                {hasRejections ? 'Rechazar' : 'Siguiente'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.payButton, isCreating && styles.payButtonDisabled]}
            onPress={handlePage2Pay}
            disabled={isCreating}
          >
            {isCreating ? (
              <Text style={styles.payButtonText}>Procesando...</Text>
            ) : (
              <Text style={styles.payButtonText}>Pagar</Text>
            )}
          </TouchableOpacity>
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
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
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
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  backButton: {
    padding: spacing.xs,
  },
  backButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
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
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 120,
    alignItems: 'center',
  },
  nextButtonRejected: {
    backgroundColor: colors.error,
  },
  nextButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  nextButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  nextButtonRejectedText: {
    color: colors.onError,
  },
  payButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 160,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  payButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
};

export default AcceptQuoteScreen;
