import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { UserRole } from "../types/role";
import { useLocations } from "../hooks/useLocations";
import { useDeviceLocation } from "../hooks/useDeviceLocation";
import { LocationCard } from "../components/location/LocationCard";
import { LocationsMapPreview } from "../components/location/LocationsMapPreview";
import { LocationFormModal } from "../components/location/LocationFormModal";
import { ConfirmDialog } from "../components/location/ConfirmDialog";
import {
  CreateLocationPayload,
  MAX_LOCATIONS_PER_USER,
  SavedLocation,
} from "../types/location";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  roleAccent,
} from "../theme/tokens";

export interface LocationsScreenProps {
  role: UserRole;
  /** Llegar desde el pop-up de búsqueda ("Agregar ubicación"): abre el
   * formulario de alta directamente al montar la pantalla. */
  openCreateOnMount?: boolean;
  onGoBack: () => void;
}

/**
 * "Mis Ubicaciones": lista, agrega, edita, marca como principal y elimina las
 * ubicaciones guardadas del usuario, con un mapa de vista general y un mapa
 * interactivo en el alta/edición.
 */
export const LocationsScreen: React.FC<LocationsScreenProps> = ({
  role,
  openCreateOnMount,
  onGoBack,
}) => {
  const accentColor = roleAccent(role);
  const device = useDeviceLocation();
  const {
    locations,
    status,
    error,
    actionError,
    saving,
    deletingId,
    refreshing,
    reload,
    refresh,
    clearActionError,
    createLocation,
    updateLocation,
    setPrimary,
    deleteLocation,
  } = useLocations(device.coordinates);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<SavedLocation | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedLocation | null>(
    null,
  );

  const limitReached = locations.length >= MAX_LOCATIONS_PER_USER;

  const openCreate = () => {
    clearActionError();
    setEditing(null);
    setFormVisible(true);
  };

  // Atajo desde el pop-up de búsqueda: la pantalla monta con el formulario
  // de alta abierto; al cerrarlo queda la lista y "Atrás" vuelve al pop-up.
  useEffect(() => {
    if (openCreateOnMount) openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (location: SavedLocation) => {
    clearActionError();
    setEditing(location);
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setEditing(null);
  };

  const handleSubmit = async (payload: CreateLocationPayload) => {
    if (editing) {
      const updated = await updateLocation(editing.id, payload);
      if (updated) closeForm();
      return;
    }
    const created = await createLocation(payload);
    if (created) closeForm();
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    await deleteLocation(pendingDelete.id);
    setPendingDelete(null);
  };

  const handleSetPrimary = async (location: SavedLocation) => {
    await setPrimary(location.id);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onGoBack}
          style={styles.backButton}
          testID="btn-locations-back"
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Text style={[styles.backArrow, { color: accentColor }]}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mis Ubicaciones</Text>
        <View style={styles.headerSpacer} />
      </View>

      {status === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.centerText}>Cargando ubicaciones...</Text>
        </View>
      )}

      {status === "error" && (
        <View style={styles.center}>
          <Text style={styles.errorText} testID="locations-error">
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: accentColor }]}
            onPress={reload}
            testID="btn-locations-retry"
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === "success" && (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={accentColor}
                colors={[accentColor]}
              />
            }
          >
            {device.denied && (
              <View style={styles.locationBanner} testID="locations-permission">
                <Feather
                  name="map-pin"
                  size={16}
                  color={colors.onWarningContainer}
                  accessible={false}
                />
                <Text style={styles.locationBannerText}>
                  Activá tu ubicación para ver primero las direcciones más
                  cercanas.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    void device.request();
                  }}
                  testID="btn-enable-location"
                  accessibilityRole="button"
                  accessibilityLabel="Activar ubicación"
                >
                  <Text
                    style={[
                      styles.locationBannerAction,
                      { color: accentColor },
                    ]}
                  >
                    Activar
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {actionError && (
              <View style={styles.banner}>
                <Text style={styles.bannerText} testID="locations-action-error">
                  {actionError}
                </Text>
              </View>
            )}

            {locations.length === 0 ? (
              <View style={styles.empty} testID="locations-empty">
                <Text style={styles.emptyIcon}>📍</Text>
                <Text style={styles.emptyTitle}>
                  No tenés ubicaciones guardadas
                </Text>
                <Text style={styles.emptyText}>
                  Agregá una dirección para usarla en tus órdenes.
                </Text>
              </View>
            ) : (
              <>
                <LocationsMapPreview
                  locations={locations}
                  accentColor={accentColor}
                  onSelect={openEdit}
                  userLocation={device.coordinates}
                  role={role}
                />
                <View style={styles.list}>
                  {locations.map((location) => (
                    <LocationCard
                      key={location.id}
                      location={location}
                      deleting={deletingId === location.id}
                      busy={saving}
                      accentColor={accentColor}
                      role={role}
                      onEdit={() => openEdit(location)}
                      onDelete={() => {
                        clearActionError();
                        setPendingDelete(location);
                      }}
                      onSetPrimary={() => {
                        void handleSetPrimary(location);
                      }}
                    />
                  ))}
                </View>
              </>
            )}

            {limitReached ? (
              <Text style={styles.limitNote} testID="locations-limit-note">
                Llegaste al máximo de {MAX_LOCATIONS_PER_USER} ubicaciones.
              </Text>
            ) : (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: accentColor }]}
                onPress={openCreate}
                disabled={saving}
                testID="btn-add-location"
                accessibilityRole="button"
                accessibilityLabel="Agregar ubicación"
              >
                <Text style={styles.addButtonText}>+ Agregar Ubicación</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <LocationFormModal
            visible={formVisible}
            mode={editing ? "edit" : "create"}
            initial={editing}
            saving={saving}
            error={actionError}
            onSubmit={handleSubmit}
            onDismiss={closeForm}
            accentColor={accentColor}
            role={role}
            userLocation={device.coordinates}
            onUseCurrentLocation={device.request}
          />

          <ConfirmDialog
            visible={pendingDelete !== null}
            title="Eliminar ubicación"
            message={
              pendingDelete
                ? `¿Querés eliminar "${pendingDelete.address}"? Esta acción no se puede deshacer.`
                : ""
            }
            confirmLabel="Eliminar"
            onConfirm={handleConfirmDelete}
            onCancel={() => setPendingDelete(null)}
            busy={deletingId !== null}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backArrow: { fontSize: 24, fontWeight: "bold" },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: { width: 40 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  centerText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.md,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  retryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  banner: {
    backgroundColor: colors.errorContainer,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  bannerText: {
    color: colors.onErrorContainer,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.warningContainer,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  locationBannerText: {
    flex: 1,
    color: colors.onWarningContainer,
    fontSize: typography.fontSizes.sm,
  },
  locationBannerAction: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    textAlign: "center",
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
  },
  list: {
    marginTop: spacing.md,
  },
  limitNote: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
    marginTop: spacing.md,
  },
  addButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  addButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default LocationsScreen;
