import React, { useEffect, useState } from 'react';
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
import { colors, spacing, borderRadius, typography, shadows } from '../theme/tokens';
import { PrimaryButton, SecondaryButton, ErrorBanner } from '../components/base';
import { useQuoteRequest } from '../hooks/useQuoteRequest';
import { categoryService } from '../services/categoryService';
import { Category } from '../types/category';
import { useLocations } from '../hooks/useLocations';
import { LocationFormModal } from '../components/location/LocationFormModal';
import { SearchOriginModal } from '../components/location/SearchOriginModal';
import { useDeviceLocation } from '../hooks/useDeviceLocation';
import { chatService } from '../services/chatService';
import { CreateLocationPayload, SavedLocation } from '../types/location';

export interface QuoteRequestScreenProps {
  /** ID del trabajador al que se le solicita la cotización. */
  workerId: string;
  /** ID del chat donde se enviará el mensaje del sistema. */
  chatId: string;
  /** ID del usuario cliente autenticado. */
  myUserId: string;
  /** Callback al cerrar la pantalla. */
  onClose: () => void;
  /** Callback cuando la solicitud se envía exitosamente.
   * Recibe el objeto quote_request creado por el backend. */
  onRequestSuccess: (quoteRequest: {
    id: string;
    client_id: string;
    worker_id: string;
    category: string | null;
    location: string | null;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }) => void;
}

/**
 * Pantalla de solicitud de cotización desde el chat.
 *
 * Muestra un formulario completo con:
 * - Título "Solicitar Cotización"
 * - Categoría del servicio (desplegable inline con opciones)
 * - Ubicación del servicio (lista de guardadas o agregar nueva)
 * - Descripción del trabajo (opcional, con contador de caracteres)
 * - Botones "Cancelar" y "Confirmar"
 *
 * Las categorías se cargan desde el catálogo activo del backend.
 */

/** Límite de caracteres para la descripción (alineado con EditProfile). */
const MAX_DESCRIPTION_LENGTH = 500;

export const QuoteRequestScreen: React.FC<QuoteRequestScreenProps> = ({
  workerId,
  chatId,
  myUserId,
  onClose,
  onRequestSuccess,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [location, setLocation] = useState('');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { requestQuote, isSending } = useQuoteRequest();
  const selectedCategoryName =
    categories.find((category) => category.id === selectedCategoryId)?.name ??
    'Seleccionar categoría...';

  useEffect(() => {
    let active = true;
    categoryService
      .listCategories()
      .then((list) => {
        if (!active) return;
        setCategories(list);
        setSelectedCategoryId((current) => current || list[0]?.id || '');
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // Ubicaciones guardadas del usuario
  const device = useDeviceLocation();
  const { createLocation } = useLocations(device.coordinates);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationSelectionVisible, setLocationSelectionVisible] = useState(false);
  const [creatingLocation, setCreatingLocation] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategoryId) {
      setError('La categoría es requerida');
      return;
    }
    if (!locationId) {
      setError('La ubicación es requerida');
      return;
    }

    try {
      const created = await requestQuote({
        worker_id: workerId,
        category_id: selectedCategoryId,
        location_id: locationId,
        description: description.trim() || null,
      });

      // Enviar mensaje del sistema al chat inmediatamente
      try {
        await chatService.sendMessage(chatId, myUserId, {
          message_type: 'QUOTE',
          content: 'Cotización solicitada',
        });
      } catch {
        // Si falla el mensaje del sistema, la cotización ya se creó, no bloqueamos.
      }

      onRequestSuccess(created);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al solicitar cotización';
      setError(message);
      Alert.alert('Error', message, [{ text: 'Aceptar', style: 'default' }]);
    }
  };

  const handleLocationCreate = async (payload: CreateLocationPayload) => {
    try {
      const created = await createLocation(payload);
      if (created) {
        setLocation(created.address);
        setLocationId(created.id);
        setCreatingLocation(false);
        setLocationModalVisible(false);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear ubicación';
      setError(message);
      setCreatingLocation(false);
    }
  };

  const handleLocationSelect = (selected: SavedLocation) => {
    setLocation(selected.address);
    setLocationId(selected.id);
    setLocationSelectionVisible(false);
  };

  const handleAddLocation = () => {
    setLocationSelectionVisible(false);
    setLocationModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Feather name="x" size={20} color={colors.textMuted} accessible={false} />
        </TouchableOpacity>
        <Text style={styles.title}>Solicitar Cotización</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Cuerpo del formulario con scroll */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Categoría del servicio */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Categoría del servicio</Text>
          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => setCategoryDropdownVisible(!categoryDropdownVisible)}
          >
            <Text style={styles.categoryValue}>{selectedCategoryName}</Text>
            <Feather name="chevron-down" size={16} color={colors.textMuted} accessible={false} />
          </TouchableOpacity>
        </View>

        {/* Ubicación del servicio */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Ubicación del servicio</Text>
          <TouchableOpacity style={styles.input} onPress={() => setLocationSelectionVisible(true)}>
            <Text style={styles.locationValue}>{location || 'Seleccionar ubicación...'}</Text>
            <Feather name="map-pin" size={16} color={colors.textMuted} accessible={false} />
          </TouchableOpacity>
        </View>

        {/* Descripción del trabajo */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Descripción del trabajo (opcional)</Text>
          <TextInput
            style={styles.multilineInput}
            placeholder="Ej: Reparar fuga en la cocina, cambiar grifería..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            maxLength={MAX_DESCRIPTION_LENGTH}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.descriptionCounter}>
            {description.length}/{MAX_DESCRIPTION_LENGTH}
          </Text>
        </View>

        {error && <ErrorBanner message={error} testID="quote-request-error" />}
      </ScrollView>

      {/* Pie con botones */}
      <View style={styles.modalFooter}>
        <SecondaryButton
          title="Cancelar"
          onPress={onClose}
          accentColor={colors.primary}
          testID="btn-quote-request-cancel"
        />
        <PrimaryButton
          title={isSending ? 'Confirmando...' : 'Confirmar'}
          onPress={handleSubmit}
          disabled={isSending}
          loading={isSending}
          loadingTestID="quote-request-loading-spinner"
          accentColor={colors.primary}
          testID="btn-submit-quote-request"
        />
      </View>

      {/* Desplegable de categorías (se estira hacia abajo) */}
      {categoryDropdownVisible && (
        <View style={styles.categoryDropdownContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryOption,
                selectedCategoryId === category.id && styles.categoryOptionSelected,
              ]}
              onPress={() => {
                setSelectedCategoryId(category.id);
                setCategoryDropdownVisible(false);
              }}
            >
              <Text style={styles.categoryOptionText}>
                {category.name}
              </Text>
              {selectedCategoryId === category.id && (
                <Feather name="check" size={14} color={colors.primary} accessible={false} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Modal: Selección de ubicación (guardadas + agregar nueva) */}
      <SearchOriginModal
        visible={locationSelectionVisible}
        onSelect={handleLocationSelect}
        onAddLocation={handleAddLocation}
        onDismiss={() => setLocationSelectionVisible(false)}
      />

      {/* Modal: Formulario de ubicación (agregar nueva) */}
      <LocationFormModal
        visible={locationModalVisible}
        mode="create"
        initial={null}
        saving={creatingLocation}
        error={null}
        onSubmit={handleLocationCreate}
        onDismiss={() => setLocationModalVisible(false)}
        accentColor={colors.primary}
        role="client"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
  categoryButton: {
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
  categoryValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
  },
  locationValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
  },
  categoryDropdownContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    maxHeight: spacing.md * 8,
    marginTop: spacing.xs,
    overflow: 'hidden',
    ...shadows.card,
  },
  categoryOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primaryContainer,
  },
  categoryOptionText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
  },
  input: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multilineInput: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
    minHeight: spacing.md * 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceContainerLow,
  },
  descriptionCounter: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    alignSelf: 'flex-end',
    marginTop: spacing.xs / 2,
  },
});

export default QuoteRequestScreen;
