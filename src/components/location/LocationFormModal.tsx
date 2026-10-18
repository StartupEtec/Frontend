import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AddressSearchInput } from "./AddressSearchInput";
import { LocationMapPicker } from "./LocationMapPicker";
import { useLocationForm } from "../../hooks/useLocationForm";
import {
  Coordinates,
  CreateLocationPayload,
  SavedLocation,
} from "../../types/location";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";
import { UserRole } from "../../types/role";

interface LocationFormModalProps {
  visible: boolean;
  mode: "create" | "edit";
  /** Ubicación a editar (solo en modo edit). */
  initial?: SavedLocation | null;
  saving: boolean;
  error?: string | null;
  onSubmit: (payload: CreateLocationPayload) => void;
  onDismiss: () => void;
  accentColor?: string;
  role?: UserRole | null;
  /** Posición del dispositivo para el punto azul y "usar mi ubicación". */
  userLocation?: Coordinates | null;
  /** Pide/refresca la ubicación del dispositivo; devuelve null si falla. */
  onUseCurrentLocation?: () => Promise<Coordinates | null>;
}

/**
 * Modal de alta/edición de ubicación: búsqueda de dirección + mapa
 * interactivo + marca de "predeterminada". Valida y devuelve el payload
 * listo para el backend; el guardado lo maneja el padre.
 */
export const LocationFormModal: React.FC<LocationFormModalProps> = ({
  visible,
  mode,
  initial,
  saving,
  error,
  onSubmit,
  onDismiss,
  accentColor = colors.primary,
  role,
  userLocation,
  onUseCurrentLocation,
}) => {
  const form = useLocationForm(initial);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Precarga/reset del formulario cada vez que se abre el modal.
  useEffect(() => {
    if (visible) {
      form.reset(initial ?? null);
      setLocationError(null);
    }
  }, [visible, initial, form.reset]);

  const handleSubmit = () => {
    if (!form.validate()) return;
    onSubmit(form.buildPayload());
  };

  const handleUseCurrentLocation = async () => {
    setLocationError(null);
    let coords = userLocation ?? null;
    if (!coords && onUseCurrentLocation) {
      setLocating(true);
      try {
        coords = await onUseCurrentLocation();
      } finally {
        setLocating(false);
      }
    }
    if (!coords) {
      setLocationError(
        "No pudimos obtener tu ubicación. Revisá los permisos del dispositivo.",
      );
      return;
    }
    await form.moveToCoordinates(coords, { force: true });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onDismiss}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === "create" ? "Agregar ubicación" : "Editar ubicación"}
          </Text>
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.closeButton}
            testID="btn-location-form-close"
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <Feather name="x" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AddressSearchInput
            value={form.address}
            onChangeText={form.changeAddress}
            onSearch={form.searchAddress}
            onSelect={form.selectResult}
            results={form.results}
            searching={form.searching}
            error={form.errors.address ?? form.searchError}
            accentColor={accentColor}
          />

          <LocationMapPicker
            coordinates={form.coordinates}
            onChange={form.moveToCoordinates}
            accentColor={accentColor}
            userLocation={userLocation}
            circles={
              role === "worker" &&
              initial &&
              initial.coverage_radius_km != null &&
              initial.coverage_radius_km > 0
                ? [
                    {
                      id: `circle-${initial.id}`,
                      latitude: initial.latitude,
                      longitude: initial.longitude,
                      radiusKm: initial.coverage_radius_km,
                      color: accentColor,
                      fillOpacity: 0.15,
                    },
                  ]
                : []
            }
          />

          <View style={styles.mapFooter}>
            {form.resolving ? (
              <View style={styles.resolvingRow}>
                <ActivityIndicator size="small" color={accentColor} />
                <Text style={styles.resolvingText}>Buscando dirección...</Text>
              </View>
            ) : form.errors.coordinates ? (
              <Text style={styles.error} testID="location-coordinates-error">
                {form.errors.coordinates}
              </Text>
            ) : (
              <Text style={styles.helper}>
                Arrastrá el pin o tocá el mapa para ajustar la ubicación.
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleUseCurrentLocation}
            disabled={locating}
            testID="btn-use-current-location"
            accessibilityRole="button"
            accessibilityLabel="Usar mi ubicación actual"
          >
            {locating ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <Feather name="crosshair" size={16} color={accentColor} />
            )}
            <Text style={[styles.locationButtonText, { color: accentColor }]}>
              Usar mi ubicación actual
            </Text>
          </TouchableOpacity>

          {locationError && (
            <Text style={styles.error} testID="location-geo-error">
              {locationError}
            </Text>
          )}

          {role === "worker" && (
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.switchText}>Radio de cobertura</Text>
                <Text style={styles.switchHint}>
                  Área circular en kilómetros (ej. 5 o 2,5 km)
                </Text>
              </View>
              <TextInput
                style={styles.radiusInput}
                value={form.coverageRadiusKm}
                onChangeText={form.changeCoverageRadiusKm}
                keyboardType="numeric"
                placeholder="ej. 5"
                placeholderTextColor={colors.textMuted}
                testID="input-location-radius"
                returnKeyType="done"
              />
            </View>
          )}

          {role === "worker" && form.errors.coverageRadiusKm && (
            <Text style={styles.error} testID="location-radius-error">
              {form.errors.coverageRadiusKm}
            </Text>
          )}

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.switchText}>Ubicación predeterminada</Text>
              <Text style={styles.switchHint}>
                Se usará por defecto en nuevas órdenes
              </Text>
            </View>
            <Switch
              value={form.isPrimary}
              onValueChange={form.toggleIsPrimary}
              trackColor={{ true: accentColor, false: colors.surfaceDim }}
              testID="switch-location-primary"
            />
          </View>

          {error && (
            <Text style={styles.error} testID="location-form-error">
              {error}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.submit,
              { backgroundColor: accentColor },
              saving && styles.submitDisabled,
            ]}
            onPress={handleSubmit}
            disabled={saving}
            testID="btn-location-save"
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.submitText}>
                {mode === "create" ? "Guardar ubicación" : "Guardar cambios"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  mapFooter: {
    marginTop: spacing.sm,
    minHeight: 20,
  },
  resolvingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  resolvingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
  },
  helper: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  locationButtonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  error: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  radiusInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    textAlign: "right",
    color: colors.textPrimary,
    backgroundColor: colors.cardBackground,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  switchLabel: {
    flex: 1,
  },
  switchText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  switchHint: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  submit: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default LocationFormModal;
