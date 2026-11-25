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
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius, typography } from '../theme/tokens';
import { useCompleteQuote } from '../hooks/useCompleteQuote';
import { chatService } from '../services/chatService';
import { quoteService } from '../services/quoteService';
import { apiClient } from '../services/api';
import { QuoteData, QuoteRequestData } from '../types/chat';

export interface CompleteQuoteScreenProps {
  /** ID de la solicitud de cotización recibida. */
  quoteRequestId: string;
  /** ID del chat donde se enviará el mensaje de rechazo. */
  chatId?: string;
  /** ID del usuario trabajador autenticado. */
  myUserId?: string;
  /** Callback al volver al chat sin hacer cambios. */
  onClose: () => void;
  /** Callback al rechazar categoría o ubicación. */
  onRejected: (fields: string[]) => void;
  /** Callback al completar la cotización exitosamente. */
  onCompleted: (quote: QuoteData) => void;
}

/**
 * Pantalla "Completar Cotización" para el trabajador (Issue #35).
 *
 * Tiene dos páginas:
 * 1) Revisar y aprobar/rechazar categoría y ubicación de la solicitud.
 *    Los campos empiezan aprobados por defecto. Si se rechazan, el botón
 *    cambia a "Rechazar" (fondo rojo) y al confirmar se envía un mensaje
 *    al chat con los campos rechazados.
 * 2) Seleccionar fecha, hora y precio propuestos.
 */
export const CompleteQuoteScreen: React.FC<CompleteQuoteScreenProps> = ({
  quoteRequestId,
  chatId = '',
  myUserId = '',
  onClose,
  onRejected,
  onCompleted,
}) => {
  const [page, setPage] = useState<1 | 2>(1);
  const [quoteRequest, setQuoteRequest] = useState<QuoteRequestData | null>(null);
  const [loading, setLoading] = useState(true);

  // Página 1: aprobación de campos. Empiezan aprobados por defecto.
  const [approvedCategory, setApprovedCategory] = useState(true);
  const [approvedLocation, setApprovedLocation] = useState(true);

  // Página 2: fecha, hora, precio
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [priceInput, setPriceInput] = useState('');

  const {
    validateForm,
    createQuoteFromRequest,
    isCreating,
    apiError,
    reset: _reset,
  } = useCompleteQuote();

  // Cargar la solicitud de cotización al montar.
  useEffect(() => {
    const loadQuoteRequest = async () => {
      try {
        const qr = await quoteService.getQuoteRequest(quoteRequestId);
        setQuoteRequest(qr);
      } catch {
        Alert.alert('Error', 'No se pudo cargar la solicitud de cotización');
      } finally {
        setLoading(false);
      }
    };
    loadQuoteRequest();
  }, [quoteRequestId]);

  const allFieldsApproved = approvedCategory && approvedLocation;
  const rejectedFields: string[] = [];
  if (!approvedCategory) rejectedFields.push('categoria');
  if (!approvedLocation) rejectedFields.push('ubicacion');
  const hasRejections = rejectedFields.length > 0;

  const handleToggleCategory = () => {
    setApprovedCategory((prev) => !prev);
  };

  const handleToggleLocation = () => {
    setApprovedLocation((prev) => !prev);
  };

  const buildRejectionMessage = (fields: string[]): string => {
    const campos = fields.join(', ');
    return `La cotización fue rechazada por el/los campo/s: ${campos}`;
  };

  const handleRejectQuote = async (): Promise<void> => {
    const rejectionReason = `Campos rechazados: ${rejectedFields.join(', ')}`;

    try {
      // Actualizar estado de la solicitud a REJECTED en el backend.
      await apiClient<{ quote_request: QuoteRequestData }>(
        `/quote-requests/requests/${quoteRequestId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'REJECTED', rejection_reason: rejectionReason }),
        },
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
        'Debe aprobar la categoría y la ubicación antes de continuar.',
        [{ text: 'Aceptar', style: 'default' }],
      );
      return;
    }
    setPage(2);
  };

  const handlePage1Cancel = () => {
    onClose();
  };

  // --- Página 2 ---

  const handleDatePress = () => setDatePickerVisible(true);
  const handleTimePress = () => setTimePickerVisible(true);

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    setDatePickerVisible(false);
    if (selectedDate) {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const d = String(selectedDate.getDate()).padStart(2, '0');
      setSelectedDate(`${y}-${m}-${d}`);
    }
  };

  const handleTimeChange = (_event: unknown, selectedTime?: Date) => {
    setTimePickerVisible(false);
    if (selectedTime) {
      const h = String(selectedTime.getHours()).padStart(2, '0');
      const min = String(selectedTime.getMinutes()).padStart(2, '0');
      setSelectedTime(`${h}:${min}`);
    }
  };

  const handlePage2Back = () => {
    setPage(1);
  };

  const handlePage2Confirm = useCallback(async () => {
    const formData = {
      proposed_date: selectedDate,
      proposed_time: selectedTime,
      proposed_price: parseFloat(priceInput) || 0,
    };

    const valid = validateForm(formData);
    if (!valid) return;

    const quote = await createQuoteFromRequest(quoteRequestId, formData);
    if (quote) {
      onCompleted(quote);
    }
  }, [selectedDate, selectedTime, priceInput, quoteRequestId, validateForm, createQuoteFromRequest, onCompleted]);

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
          {page === 1 ? 'Revisar Solicitud' : 'Detalles de Cotización'}
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
            {/* Categoría */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Categoría del servicio</Text>
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>{quoteRequest.category}</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, approvedCategory && styles.toggleActive]}
                  onPress={handleToggleCategory}
                >
                  <Feather
                    name={approvedCategory ? 'check-circle' : 'circle'}
                    size={20}
                    color={approvedCategory ? colors.success : colors.textMuted}
                    accessible={false}
                  />
                </TouchableOpacity>
              </View>
              {!approvedCategory && rejectedFields.includes('categoria') && (
                <Text style={styles.fieldRejected}>Rechazado</Text>
              )}
            </View>

            {/* Ubicación */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ubicación del servicio</Text>
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>{quoteRequest.location}</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, approvedLocation && styles.toggleActive]}
                  onPress={handleToggleLocation}
                >
                  <Feather
                    name={approvedLocation ? 'check-circle' : 'circle'}
                    size={20}
                    color={approvedLocation ? colors.success : colors.textMuted}
                    accessible={false}
                  />
                </TouchableOpacity>
              </View>
              {!approvedLocation && rejectedFields.includes('ubicacion') && (
                <Text style={styles.fieldRejected}>Rechazado</Text>
              )}
            </View>

            {/* Descripción */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Descripción del trabajo</Text>
              <Text style={styles.descriptionText}>
                {quoteRequest.description ?? 'Sin descripción'}
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Fecha */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Fecha de la visita</Text>
              <TouchableOpacity style={styles.dateInput} onPress={handleDatePress}>
                <Text style={styles.dateValue}>
                  {selectedDate || 'Seleccionar fecha...'}
                </Text>
                <Feather name="calendar" size={16} color={colors.textMuted} accessible={false} />
              </TouchableOpacity>
              {datePickerVisible && (
                <DateTimePicker
                  value={selectedDate ? new Date(selectedDate) : new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Hora */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Hora de la visita</Text>
              <TouchableOpacity style={styles.timeInput} onPress={handleTimePress}>
                <Text style={styles.timeValue}>
                  {selectedTime || 'Seleccionar hora...'}
                </Text>
                <Feather name="clock" size={16} color={colors.textMuted} accessible={false} />
              </TouchableOpacity>
              {timePickerVisible && (
                <DateTimePicker
                  value={selectedTime ? new Date(`2000-01-01T${selectedTime}:00`) : new Date()}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
            </View>

            {/* Precio */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Precio propuesto</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                value={priceInput}
                keyboardType="numeric"
                onChangeText={setPriceInput}
              />
            </View>

            {apiError && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={16} color={colors.error} accessible={false} />
                <Text style={styles.apiErrorText}>{apiError}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Pie con botones */}
      <View style={styles.footer}>
        {page === 1 ? (
          <>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handlePage1Cancel}
            >
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
            style={[styles.confirmButton, isCreating && styles.confirmButtonDisabled]}
            onPress={handlePage2Confirm}
            disabled={isCreating}
          >
            {isCreating ? (
              <Text style={styles.confirmButtonText}>Creando...</Text>
            ) : (
              <Text style={styles.confirmButtonText}>Confirmar Cotización</Text>
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
  dateInput: {
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
  timeInput: {
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
  dateValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    flex: 1,
  },
  timeValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    flex: 1,
  },
  priceInput: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  apiErrorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginLeft: spacing.xs,
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
  confirmButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 160,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  confirmButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default CompleteQuoteScreen;
