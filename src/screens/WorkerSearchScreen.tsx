import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useDeviceLocation } from "../hooks/useDeviceLocation";
import { useNearbyWorkers } from "../hooks/useNearbyWorkers";
import { LeafletMap, LeafletMarker } from "../components/location/LeafletMap";
import { WorkerFilters } from "../components/worker/WorkerFilters";
import { WorkerCard } from "../components/worker/WorkerCard";
import { Coordinates } from "../types/location";
import {
  NearbyWorker,
  NEARBY_FIXED_RADIUS_KM,
  NEARBY_MAX_LIMIT,
} from "../types/worker";
import { DEFAULT_CENTER, sameCoordinates, zoomForRadius } from "../utils/map";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  roleAccent,
} from "../theme/tokens";

export interface WorkerSearchScreenProps {
  role: UserRole;
  onGoBack: () => void;
  onViewProfile: (worker: NearbyWorker) => void;
}

/** Tolerancia (~1 m) para reconocer recentrados programáticos en moveend. */
const CENTER_EPSILON = 1e-5;

const PLANNED_FEATURE_MESSAGE =
  "El flujo de cotización de servicios estará disponible en una próxima versión.";

/**
 * "Buscar Trabajadores": mapa interactivo (Leaflet + OSM en WebView) con un
 * pin verde por trabajador disponible (el punto azul es tu ubicación), filtro
 * de categoría, contador de resultados y vista de lista alternativa.
 *
 * La búsqueda usa GET /workers/nearby con el centro visible del mapa y un
 * radio fijo (sin filtro de distancia): se consulta al cargar y cada vez que
 * el usuario mueve el mapa (`onMoveEnd`).
 * Al tocar un pin se abre una ficha resumida con "Ver Perfil Completo" y
 * "Solicitar Servicio".
 */
export const WorkerSearchScreen: React.FC<WorkerSearchScreenProps> = ({
  role,
  onGoBack,
  onViewProfile,
}) => {
  const accentColor = roleAccent(role);
  const device = useDeviceLocation();

  // Radio fijo de búsqueda (sin filtro de distancia en la UI).
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedWorker, setSelectedWorker] = useState<NearbyWorker | null>(
    null,
  );

  // Centro de búsqueda (lo que viaja a la API): el del dispositivo la primera
  // vez; después, el centro visible del mapa cuando el usuario lo mueve.
  const [searchCenter, setSearchCenter] = useState<Coordinates | null>(null);
  const searchCenterRef = useRef<Coordinates | null>(null);

  // Centro/zoom que VE el mapa: se actualiza solo en movimientos
  // programáticos (init o recentrado) y al sincronizar el
  // gesto del usuario, de modo que un recargo de la WebView vuelva a esta
  // vista sin pisar nunca el zoom elegido a mano.
  const [mapCenter, setMapCenter] = useState<Coordinates | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [centerKey, setCenterKey] = useState(0);
  // Último setView disparado por nosotros: si el moveend coincide con este
  // centro, no se re-busca (evita bucles al recentrar por código).
  const programmaticRef = useRef<Coordinates | null>(null);

  const applyProgrammaticView = useCallback(
    (center: Coordinates, zoom: number) => {
      programmaticRef.current = {
        latitude: center.latitude,
        longitude: center.longitude,
      };
      setMapCenter(center);
      setMapZoom(zoom);
      setCenterKey((key) => key + 1);
    },
    [],
  );

  // Primera ubicación: posición del dispositivo o, si no está disponible,
  // un centro por defecto para que la búsqueda igual funcione (con banner).
  useEffect(() => {
    if (searchCenter) return;
    const initial = device.coordinates;
    const fallback = device.denied || device.unavailable;
    if (!initial && !fallback) return;
    const center = initial ?? DEFAULT_CENTER;
    searchCenterRef.current = center;
    setSearchCenter(center);
    applyProgrammaticView(
      center,
      zoomForRadius(NEARBY_FIXED_RADIUS_KM, center.latitude),
    );
  }, [searchCenter, device, applyProgrammaticView]);

  const { workers, status, error, refreshing, reload } = useNearbyWorkers({
    center: searchCenter,
    radiusKm: NEARBY_FIXED_RADIUS_KM,
    categoryId,
  });

  // El usuario dejó de mover/zoom el mapa: re-buscar en la nueva zona.
  const handleMoveEnd = useCallback((center: Coordinates, zoom: number) => {
    const programmatic = programmaticRef.current;
    if (programmatic && sameCoordinates(programmatic, center, CENTER_EPSILON)) {
      // Recentrado hecho por código (init/filtro/recentrado): ignorar.
      programmaticRef.current = null;
      return;
    }
    const current = searchCenterRef.current;
    if (current && sameCoordinates(current, center, CENTER_EPSILON)) {
      // Mismo centro que la búsqueda (p. ej. reenvío tras recargar la
      // WebView): solo se sincroniza el zoom, sin re-consultar.
      setMapZoom(zoom);
      return;
    }
    const next = { latitude: center.latitude, longitude: center.longitude };
    searchCenterRef.current = next;
    setSearchCenter(next);
    // El mapa ya está en (next, zoom): sincronizar los props de vista no lo
    // mueve, pero permite que un recargo vuelva exactamente acá.
    programmaticRef.current = next;
    setMapCenter(next);
    setMapZoom(zoom);
    setCenterKey((key) => key + 1);
  }, []);

  const recenterOnDevice = useCallback(() => {
    const coordinates = device.coordinates;
    if (!coordinates) {
      void device.request();
      return;
    }
    searchCenterRef.current = coordinates;
    setSearchCenter(coordinates);
    applyProgrammaticView(
      coordinates,
      zoomForRadius(NEARBY_FIXED_RADIUS_KM, coordinates.latitude),
    );
  }, [device, applyProgrammaticView]);

  const handleRequestService = useCallback(() => {
    Alert.alert("Próximamente", PLANNED_FEATURE_MESSAGE);
  }, []);

  // Pines de trabajadores siempre en verde (colors.workerAccent); el punto
  // azul de la ubicación del usuario lo dibuja LeafletMap por su cuenta.
  const markers: LeafletMarker[] = workers.map((worker) => ({
    id: worker.worker_id,
    latitude: worker.latitude,
    longitude: worker.longitude,
    color: colors.workerAccent,
    title: worker.full_name,
  }));

  const truncated = workers.length >= NEARBY_MAX_LIMIT;
  const countLabel =
    workers.length === 0
      ? null
      : truncated
        ? `${workers.length}+ trabajadores encontrados`
        : `${workers.length} trabajador${workers.length === 1 ? "" : "es"} encontrado${workers.length === 1 ? "" : "s"}`;

  const locationIssue = device.denied
    ? {
        testID: "workers-permission",
        text: "Activá tu ubicación para buscar trabajadores cerca tuyo.",
        action: "Activar",
      }
    : device.unavailable
      ? {
          testID: "workers-location-unavailable",
          text: "No pudimos obtener tu ubicación. La búsqueda usa una ubicación por defecto.",
          action: "Reintentar",
        }
      : null;

  const staleError =
    status === "error" && workers.length > 0 ? (
      <View style={styles.staleBanner} testID="workers-stale-error">
        <Text style={styles.staleBannerText} numberOfLines={2}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={reload}
          testID="btn-workers-retry"
          accessibilityRole="button"
        >
          <Text style={[styles.staleRetry, { color: accentColor }]}>
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onGoBack}
          style={styles.backButton}
          testID="btn-workers-back"
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={[styles.backArrow, { color: accentColor }]}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Buscar Trabajadores</Text>
        <TouchableOpacity
          onPress={() => setView(view === "map" ? "list" : "map")}
          style={styles.viewButton}
          testID="btn-toggle-view"
          accessibilityRole="button"
          accessibilityLabel={
            view === "map"
              ? "Cambiar a vista de lista"
              : "Cambiar a vista de mapa"
          }
        >
          <Feather
            name={view === "map" ? "list" : "map"}
            size={20}
            color={accentColor}
          />
        </TouchableOpacity>
      </View>

      <WorkerFilters categoryId={categoryId} onCategoryChange={setCategoryId} />

      {/* Fila siempre montada (si hay centro) con altura fija: si aparece o
          desaparece según los resultados, la WebView cambia de tamaño,
          Leaflet "invalidateSize" panea el mapa y re-dispara moveend,
          entrando en un bucle visible de temblor. */}
      {searchCenter !== null && (
        <View style={styles.countRow} testID="worker-search-count">
          {countLabel && <Text style={styles.countText}>{countLabel}</Text>}
          {refreshing && <ActivityIndicator size="small" color={accentColor} />}
        </View>
      )}

      {locationIssue && (
        <View style={styles.permissionBanner} testID={locationIssue.testID}>
          <Feather
            name="map-pin"
            size={16}
            color={colors.onWarningContainer}
            accessible={false}
          />
          <Text style={styles.permissionText}>{locationIssue.text}</Text>
          <TouchableOpacity
            onPress={() => {
              void device.request();
            }}
            testID="btn-enable-location"
            accessibilityRole="button"
            accessibilityLabel="Activar ubicación"
          >
            <Text style={[styles.permissionAction, { color: accentColor }]}>
              {locationIssue.action}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {searchCenter === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.centerText}>Obteniendo tu ubicación...</Text>
        </View>
      ) : status === "error" && workers.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText} testID="workers-error">
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: accentColor }]}
            onPress={reload}
            testID="btn-workers-retry"
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : view === "map" ? (
        <View style={styles.mapWrap} testID="workers-map-view">
          <LeafletMap
            markers={markers}
            selectable
            userLocation={device.coordinates}
            center={mapCenter}
            zoom={mapZoom ?? undefined}
            centerKey={centerKey}
            onPress={() => setSelectedWorker(null)}
            onMarkerPress={(id) => {
              const worker = workers.find((item) => item.worker_id === id);
              setSelectedWorker(worker ?? null);
            }}
            onMoveEnd={handleMoveEnd}
            testID="worker-search-map"
          />

          {staleError}

          {status === "loading" && (
            <View
              style={styles.mapLoading}
              pointerEvents="none"
              testID="workers-loading"
            >
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={styles.mapLoadingText}>
                Buscando trabajadores...
              </Text>
            </View>
          )}

          {status === "success" && workers.length === 0 && (
            <View style={styles.mapEmpty} pointerEvents="none">
              <Text style={styles.mapEmptyText}>
                No hay trabajadores disponibles por ahora.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.recenterButton}
            onPress={recenterOnDevice}
            testID="btn-recenter"
            accessibilityRole="button"
            accessibilityLabel="Centrar en mi ubicación"
          >
            <Feather name="crosshair" size={18} color={accentColor} />
          </TouchableOpacity>

          {selectedWorker && (
            <View style={styles.sheet} testID="worker-info-sheet">
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Trabajador cerca tuyo</Text>
                <TouchableOpacity
                  onPress={() => setSelectedWorker(null)}
                  testID="btn-close-info"
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar ficha"
                >
                  <Feather name="x" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <WorkerCard
                worker={selectedWorker}
                accentColor={accentColor}
                onViewProfile={() => onViewProfile(selectedWorker)}
                onRequestService={handleRequestService}
                testID={`worker-info-${selectedWorker.worker_id}`}
              />
            </View>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {staleError}
          {status === "loading" ? (
            <View style={styles.empty} testID="workers-loading">
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={styles.emptyText}>Buscando trabajadores...</Text>
            </View>
          ) : workers.length === 0 ? (
            <View style={styles.empty} testID="workers-empty">
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>Sin trabajadores cerca</Text>
              <Text style={styles.emptyText}>
                Probá cambiando la categoría o volvé a intentar más tarde.
              </Text>
            </View>
          ) : (
            workers.map((worker) => (
              <WorkerCard
                key={worker.worker_id}
                worker={worker}
                accentColor={accentColor}
                onViewProfile={() => onViewProfile(worker)}
                onRequestService={handleRequestService}
              />
            ))
          )}
        </ScrollView>
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
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: "700",
    textAlign: "center",
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceContainerLow,
  },
  countRow: {
    // Altura fija: el alto del contenedor del mapa no debe variar con el
    // estado de la búsqueda (ver comentario en el JSX sobre el temblor).
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  countText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.warningContainer,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  permissionText: {
    flex: 1,
    color: colors.onWarningContainer,
    fontSize: typography.fontSizes.sm,
  },
  permissionAction: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
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
  mapWrap: {
    flex: 1,
    position: "relative",
  },
  mapEmpty: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  mapEmptyText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
  },
  mapLoading: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  mapLoadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  staleBanner: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  staleBannerText: {
    flex: 1,
    color: colors.onErrorContainer,
    fontSize: typography.fontSizes.sm,
  },
  staleRetry: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  recenterButton: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.xs,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  sheetTitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    textTransform: "uppercase",
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
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
});

export default WorkerSearchScreen;
