import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useNearbyWorkers } from "../hooks/useNearbyWorkers";
import { useWorkerList } from "../hooks/useWorkerList";
import { LeafletMap, LeafletMarker } from "../components/location/LeafletMap";
import { WorkerFilters } from "../components/worker/WorkerFilters";
import { WorkerListFilters } from "../components/worker/WorkerListFilters";
import { WorkerCard } from "../components/worker/WorkerCard";
import { Coordinates, SavedLocation } from "../types/location";
import {
  NearbyWorker,
  NEARBY_FIXED_RADIUS_KM,
  NEARBY_MAX_LIMIT,
} from "../types/worker";
import {
  COVERAGE_TIER_COLORS,
  DEFAULT_CENTER,
  coverageTier,
  distanceKmBetween,
  sameCoordinates,
  zoomForRadius,
} from "../utils/map";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  roleAccent,
} from "../theme/tokens";

export interface WorkerSearchScreenProps {
  role: UserRole;
  /** Ubicación guardada elegida en Main: define el centro inicial del mapa y
   * el punto contra el que se compara la cobertura de cada trabajador. */
  origin?: SavedLocation | null;
  onGoBack: () => void;
  onViewProfile: (worker: NearbyWorker) => void;
}

/**
 * Tolerancia (~20 m) para reconocer recentrados programáticos y micro-paneos
 * en `moveend`. El redondeo por píxel de Leaflet y los gestos mínimos quedan
 * dentro de este umbral: sin él, cada micro-movimiento re-consultaba la API y
 * re-inyectaba setView (temblor/búsquedas de más).
 */
const CENTER_EPSILON = 0.0002;

/**
 * Id del pin que marca la ubicación elegida. No es un trabajador: al tocarlo
 * no se abre ninguna ficha (el handler no lo encuentra y cierra la actual).
 */
const ORIGIN_MARKER_ID = "__search-origin__";

const PLANNED_FEATURE_MESSAGE =
  "El flujo de cotización de servicios estará disponible en una próxima versión.";

/**
 * "Buscar Trabajadores": mapa interactivo (Leaflet + OSM en WebView) con un
 * pin por trabajador disponible coloreado según su área de cobertura
 * (verde dentro, verde apagado si está afuera por poco, gris si está lejos),
 * el pin de la ubicación elegida (mismo estilo que en "Mis Ubicaciones"),
 * filtro de categoría, contador de resultados y vista de lista alternativa.
 *
 * La referencia geográfica es la ubicación guardada que el usuario eligió en
 * Main (no la ubicación del dispositivo): desde ese punto se centra el mapa
 * la primera vez y se evalúa la cobertura de cada trabajador.
 *
 * La búsqueda usa GET /workers/nearby con el centro visible del mapa y un
 * radio fijo (sin filtro de distancia): se consulta al cargar y cada vez que
 * el usuario mueve el mapa (`onMoveEnd`).
 * Al tocar un pin se abre una ficha resumida con "Ver Perfil Completo" y
 * "Solicitar Servicio".
 */
export const WorkerSearchScreen: React.FC<WorkerSearchScreenProps> = ({
  role,
  origin,
  onGoBack,
  onViewProfile,
}) => {
  const accentColor = roleAccent(role);

  // Radio fijo de búsqueda (sin filtro de distancia en la UI).
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedWorker, setSelectedWorker] = useState<NearbyWorker | null>(
    null,
  );

  // Centro de búsqueda (lo que viaja a la API): la ubicación elegida al
  // abrir la pantalla; después, el centro visible del mapa cuando el usuario
  // lo mueve. Sin origen (solo defensivo) se usa el centro por defecto.
  const originCoordinates: Coordinates = origin
    ? { latitude: origin.latitude, longitude: origin.longitude }
    : DEFAULT_CENTER;
  const originLatitude = originCoordinates.latitude;
  const originLongitude = originCoordinates.longitude;
  const [searchCenter, setSearchCenter] =
    useState<Coordinates>(originCoordinates);
  const searchCenterRef = useRef<Coordinates>(originCoordinates);

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

  // Primera ubicación elegida (o cambio de elección): recentrar el mapa y
  // re-buscar. El hook se re-consulta solo porque el centro cambió, y la
  // caché de sesión devuelve al instante si ya se buscó en ese punto.
  useEffect(() => {
    const center = { latitude: originLatitude, longitude: originLongitude };
    searchCenterRef.current = center;
    setSearchCenter(center);
    applyProgrammaticView(
      center,
      zoomForRadius(NEARBY_FIXED_RADIUS_KM, center.latitude),
    );
    // La ficha abierta pertenece a la búsqueda anterior.
    setSelectedWorker(null);
  }, [originLatitude, originLongitude, applyProgrammaticView]);

  const { workers, status, error, refreshing, reload } = useNearbyWorkers({
    center: searchCenter,
    radiusKm: NEARBY_FIXED_RADIUS_KM,
    categoryId,
  });

  // Vista de lista (Issue #25): filtros por nombre/calificación, ordenamiento y
  // paginación en cliente sobre los resultados ya traídos. La paginación se
  // reinicia cuando cambia el conjunto consultado (centro o categoría).
  const listResetKey = `${searchCenter.latitude},${searchCenter.longitude},${categoryId ?? ""}`;
  const {
    nameInput: listNameInput,
    filters: listFilters,
    workers: visibleWorkers,
    filteredCount,
    totalCount,
    hasMore,
    hasActiveFilters,
    setNameQuery: setListNameQuery,
    setMinRating: setListMinRating,
    setSortBy: setListSortBy,
    loadMore,
    clearFilters: clearListFilters,
  } = useWorkerList(workers, { resetKey: listResetKey });

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
      // WebView): solo se sincroniza el zoom en estado, sin re-consultar ni
      // volver a inyectar setView (evita bucles/parpadeos).
      setMapZoom(zoom);
      return;
    }
    const next = { latitude: center.latitude, longitude: center.longitude };
    searchCenterRef.current = next;
    setSearchCenter(next);
    // El mapa ya está en (next, zoom): sincronizar los props de vista para
    // conservar esa posición si la WebView se recarga, pero NO forzamos
    // un nuevo setView (centerKey no cambia). Forzar setView tras cada
    // moveend del usuario genera inyecciones redundantes y puede provocar
    // parpadeos/temblores.
    programmaticRef.current = next;
    setMapCenter(next);
    setMapZoom(zoom);
  }, []);

  // Recentra en la ubicación elegida (el mapa puede haberse movido a mano
  // para explorar otra zona).
  const recenterToOrigin = () => {
    const center = { latitude: originLatitude, longitude: originLongitude };
    searchCenterRef.current = center;
    setSearchCenter(center);
    applyProgrammaticView(
      center,
      zoomForRadius(NEARBY_FIXED_RADIUS_KM, center.latitude),
    );
  };

  const handleRequestService = useCallback(() => {
    Alert.alert("Próximamente", PLANNED_FEATURE_MESSAGE);
  }, []);

  // Pines teñidos según el área de cobertura de cada trabajador respecto de
  // la ubicación elegida: verde si su área la cubre, verde apagado si está
  // afuera pero por pocos km y gris si está muy lejos (o no definió área).
  // La referencia es fija durante la sesión (la ubicación que eligió el
  // usuario), no el centro visible del mapa ni el dispositivo.
  const coverageRef = origin ? originCoordinates : searchCenter;
  const markers: LeafletMarker[] = useMemo(
    () => [
      // Pin de la ubicación elegida (con el mismo estilo de "Mis
      // Ubicaciones"): señala el punto de referencia de la búsqueda incluso
      // cuando el mapa se explora a mano. Al tocarlo no se abre ninguna ficha.
      {
        id: ORIGIN_MARKER_ID,
        latitude: originCoordinates.latitude,
        longitude: originCoordinates.longitude,
        color: accentColor,
        title: origin?.address ?? "Ubicación elegida",
      },
      ...workers.map((worker) => {
        const tier = coverageTier(
          coverageRef
            ? distanceKmBetween(coverageRef, worker)
            : worker.distance_km,
          worker.coverage_radius_km,
        );
        return {
          id: worker.worker_id,
          latitude: worker.latitude,
          longitude: worker.longitude,
          color: COVERAGE_TIER_COLORS[tier],
          title: worker.full_name,
        };
      }),
    ],
    [
      accentColor,
      origin?.address,
      originCoordinates.latitude,
      originCoordinates.longitude,
      workers,
      coverageRef,
    ],
  );

  const truncated = workers.length >= NEARBY_MAX_LIMIT;
  const countLabel =
    workers.length === 0
      ? null
      : truncated
        ? `${workers.length}+ trabajadores encontrados`
        : `${workers.length} trabajador${workers.length === 1 ? "" : "es"} encontrado${workers.length === 1 ? "" : "s"}`;

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

      {/* Fila siempre montada con altura fija: si aparece o desaparece según
          los resultados, la WebView cambia de tamaño, Leaflet
          "invalidateSize" panea el mapa y re-dispara moveend, entrando en un
          bucle visible de temblor. */}
      <View style={styles.countRow} testID="worker-search-count">
        {countLabel && <Text style={styles.countText}>{countLabel}</Text>}
        {refreshing && <ActivityIndicator size="small" color={accentColor} />}
      </View>

      {status === "error" && workers.length === 0 ? (
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
            onPress={recenterToOrigin}
            testID="btn-recenter"
            accessibilityRole="button"
            accessibilityLabel="Centrar en la ubicación elegida"
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
        <View style={styles.listWrap}>
          <WorkerListFilters
            nameInput={listNameInput}
            onNameChange={setListNameQuery}
            minRating={listFilters.minRating}
            onMinRatingChange={setListMinRating}
            sortBy={listFilters.sortBy}
            onSortChange={setListSortBy}
            accentColor={accentColor}
            filteredCount={filteredCount}
            totalCount={totalCount}
            onClearFilters={clearListFilters}
            hasActiveFilters={hasActiveFilters}
          />

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
            ) : visibleWorkers.length === 0 ? (
              <View style={styles.empty} testID="workers-no-matches">
                <Text style={styles.emptyIcon}>🔎</Text>
                <Text style={styles.emptyTitle}>Sin coincidencias</Text>
                <Text style={styles.emptyText}>
                  No hay trabajadores que coincidan con la búsqueda o la
                  calificación mínima.
                </Text>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: accentColor }]}
                  onPress={clearListFilters}
                  testID="btn-worker-list-reset"
                  accessibilityRole="button"
                >
                  <Text style={styles.retryText}>Limpiar filtros</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {visibleWorkers.map((worker) => (
                  <WorkerCard
                    key={worker.worker_id}
                    worker={worker}
                    accentColor={accentColor}
                    onViewProfile={() => onViewProfile(worker)}
                    onRequestService={handleRequestService}
                  />
                ))}
                {hasMore && (
                  <TouchableOpacity
                    style={[
                      styles.loadMoreButton,
                      { borderColor: accentColor },
                    ]}
                    onPress={loadMore}
                    testID="btn-worker-list-load-more"
                    accessibilityRole="button"
                    accessibilityLabel="Cargar más trabajadores"
                  >
                    <Text style={[styles.loadMoreText, { color: accentColor }]}>
                      Cargar más
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Refresco en segundo plano (cambio de centro/categoría o
                revalidación de caché) sin vaciar la lista visible. */}
            {refreshing && visibleWorkers.length > 0 && (
              <View
                style={styles.listRefreshing}
                testID="workers-list-refreshing"
              >
                <ActivityIndicator size="small" color={accentColor} />
                <Text style={styles.emptyText}>Actualizando resultados...</Text>
              </View>
            )}
          </ScrollView>
        </View>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.sm,
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
  listWrap: {
    flex: 1,
  },
  loadMoreButton: {
    alignSelf: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  loadMoreText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  listRefreshing: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
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
