import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LeafletMap, LeafletMarker } from "./LeafletMap";
import { Coordinates, SavedLocation } from "../../types/location";
import { DEFAULT_CENTER, DEFAULT_ZOOM, REFERENCE_ZOOM } from "../../utils/map";
import { colors, borderRadius, spacing, typography } from "../../theme/tokens";
import { UserRole } from "../../types/role";

interface LocationsMapPreviewProps {
  locations: SavedLocation[];
  height?: number;
  accentColor?: string;
  onSelect?: (location: SavedLocation) => void;
  /** Posición del dispositivo (centra el mapa y dibuja el punto azul). */
  userLocation?: Coordinates | null;
  /** Habilita el botón para abrir el mapa en pantalla completa. */
  expandable?: boolean;
  role?: UserRole | null;
  testID?: string;
}

/** Color por defecto del pin cuando la ubicación no es la principal. */
const MARKER_COLOR = "#e5533d";

/**
 * Mapa de solo lectura con un pin por ubicación guardada (Leaflet + OSM en
 * WebView). Encuadra automáticamente todos los puntos; la principal se pinta
 * con el color de acento del rol. Se puede expandir a pantalla completa.
 */
export const LocationsMapPreview: React.FC<LocationsMapPreviewProps> = ({
  locations,
  height = 200,
  accentColor = colors.primary,
  onSelect,
  userLocation,
  expandable = true,
  role,
  testID = "locations-map-preview",
}) => {
  const [expanded, setExpanded] = useState(false);

  const markers: LeafletMarker[] = locations.map((location) => ({
    id: location.id,
    latitude: location.latitude,
    longitude: location.longitude,
    color: location.is_primary ? accentColor : MARKER_COLOR,
    title: location.address,
  }));

  const circles =
    role === "worker"
      ? locations
          .filter(
            (location) =>
              location.coverage_radius_km != null &&
              location.coverage_radius_km > 0,
          )
          .map((location) => ({
            id: `circle-${location.id}`,
            latitude: location.latitude,
            longitude: location.longitude,
            radiusKm: location.coverage_radius_km as number,
            color: location.is_primary ? accentColor : MARKER_COLOR,
            fillOpacity: 0.15,
          }))
      : [];

  const hasMarkers = markers.length > 0;
  const fitKey = hasMarkers
    ? markers.map((m) => `${m.id}:${m.latitude}:${m.longitude}`).join("|")
    : null;
  const center = hasMarkers ? null : (userLocation ?? DEFAULT_CENTER);
  const zoom = userLocation ? REFERENCE_ZOOM : DEFAULT_ZOOM;

  const renderMap = (fullscreen: boolean) => (
    <LeafletMap
      markers={markers}
      circles={circles}
      userLocation={userLocation}
      center={center}
      zoom={zoom}
      fitKey={fitKey}
      onMarkerPress={(id) => {
        const location = locations.find((item) => item.id === id);
        if (location) onSelect?.(location);
      }}
      testID={fullscreen ? `${testID}-fullscreen-map` : `${testID}-map`}
    />
  );

  return (
    <View style={[styles.container, { height }]} testID={testID}>
      {renderMap(false)}

      {expandable && (
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpanded(true)}
          testID={`${testID}-expand`}
          accessibilityRole="button"
          accessibilityLabel="Expandir mapa"
        >
          <Feather name="maximize-2" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
      )}

      {expandable && (
        <Modal
          visible={expanded}
          animationType="slide"
          onRequestClose={() => setExpanded(false)}
          presentationStyle="fullScreen"
        >
          <SafeAreaView style={styles.fullscreen} edges={["top", "bottom"]}>
            <View style={styles.fullscreenHeader}>
              <Text style={styles.fullscreenTitle}>Tus ubicaciones</Text>
              <TouchableOpacity
                onPress={() => setExpanded(false)}
                style={styles.fullscreenClose}
                testID={`${testID}-collapse`}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Feather name="x" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.fullscreenMap}>{renderMap(true)}</View>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: borderRadius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expandButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullscreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fullscreenTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  fullscreenClose: {
    padding: spacing.xs,
  },
  fullscreenMap: {
    flex: 1,
    position: "relative",
  },
});

export default LocationsMapPreview;
