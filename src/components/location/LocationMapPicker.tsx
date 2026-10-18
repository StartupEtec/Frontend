import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LeafletMap, LeafletMarker } from "./LeafletMap";
import { Coordinates } from "../../types/location";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  POINT_ZOOM,
  REFERENCE_ZOOM,
  sameCoordinates,
} from "../../utils/map";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";

interface LocationMapPickerProps {
  /** Pin actual o null si todavía no se eligió. */
  coordinates: Coordinates | null;
  onChange: (coordinates: Coordinates) => void;
  height?: number;
  accentColor?: string;
  /** Posición del dispositivo (para centrar y mostrar el punto azul). */
  userLocation?: Coordinates | null;
  /** Pide la ubicación del dispositivo si todavía no la tenemos. */
  onRequestLocation?: () => Promise<Coordinates | null> | void;
  /** Habilita el botón para abrir el mapa en pantalla completa. */
  expandable?: boolean;
  /** Círculos a dibujar (un círculo por objeto). */
  circles?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    radiusKm: number;
    color?: string;
    fillOpacity?: number;
  }>;
  testID?: string;
}

/**
 * Mapa interactivo para elegir coordenadas (Leaflet + OpenStreetMap en WebView).
 *
 * - Se puede tocar en cualquier punto del mapa o arrastrar el pin.
 * - Al cambiar las coordenadas desde fuera (p. ej. una dirección buscada o
 *   "usar mi ubicación") se centra y hace zoom automático; los cambios
 *   originados en el propio mapa no re-centran (como Google Maps).
 * - Se puede expandir a pantalla completa.
 * - Cuando hay `userLocation`, se dibuja el punto azul y hay un botón para
 *   recentrar en él.
 */
export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  coordinates,
  onChange,
  height = 220,
  accentColor = colors.primary,
  userLocation,
  expandable = true,
  circles = [],
  testID = "location-map-picker",
}) => {
  const [expanded, setExpanded] = useState(false);
  const [viewCenter, setViewCenter] = useState<Coordinates>(
    coordinates ?? userLocation ?? DEFAULT_CENTER,
  );
  const [locateNonce, setLocateNonce] = useState(0);
  const [locating, setLocating] = useState(false);
  // Guarda el último punto emitido por el propio mapa para distinguir un
  // cambio "eco" (no recentrar) de uno externo (sí recentrar).
  const lastEmittedRef = useRef<Coordinates | null>(null);

  useEffect(() => {
    if (!coordinates) return;
    if (sameCoordinates(lastEmittedRef.current, coordinates)) {
      lastEmittedRef.current = null;
      return;
    }
    setViewCenter(coordinates);
  }, [coordinates?.latitude, coordinates?.longitude]);

  useEffect(() => {
    if (coordinates || !userLocation) return;
    setViewCenter(userLocation);
  }, [coordinates, userLocation?.latitude, userLocation?.longitude]);

  const emit = (coords: Coordinates) => {
    lastEmittedRef.current = coords;
    onChange(coords);
  };

  const centerOnUser = () => {
    if (!userLocation) return;
    setViewCenter(userLocation);
    setLocateNonce((value) => value + 1);
  };

  const markers: LeafletMarker[] = coordinates
    ? [
        {
          id: "picker",
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          color: accentColor,
          draggable: true,
        },
      ]
    : [];

  const zoom = coordinates
    ? POINT_ZOOM
    : userLocation
      ? REFERENCE_ZOOM
      : DEFAULT_ZOOM;

  const renderMap = (fullscreen: boolean) => (
    <LeafletMap
      markers={markers}
      circles={circles}
      selectable
      userLocation={userLocation}
      center={viewCenter}
      centerKey={locateNonce}
      zoom={zoom}
      onPress={emit}
      onMarkerDragEnd={(_id, coords) => emit(coords)}
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

      <TouchableOpacity
        style={styles.locateButton}
        onPress={centerOnUser}
        disabled={locating}
        testID={`${testID}-locate`}
        accessibilityRole="button"
        accessibilityLabel="Centrar en mi ubicación"
      >
        {locating ? (
          <ActivityIndicator size="small" color={colors.textPrimary} />
        ) : (
          <Feather name="crosshair" size={16} color={colors.textPrimary} />
        )}
      </TouchableOpacity>

      {!coordinates && (
        <View pointerEvents="none" style={styles.hint}>
          <Text style={styles.hintText}>
            Tocá el mapa o buscá una dirección
          </Text>
        </View>
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
              <Text style={styles.fullscreenTitle}>Ajustar ubicación</Text>
              <TouchableOpacity
                onPress={() => setExpanded(false)}
                style={styles.fullscreenClose}
                testID={`${testID}-collapse`}
                accessibilityRole="button"
                accessibilityLabel="Listo"
              >
                <Text style={[styles.fullscreenDone, { color: accentColor }]}>
                  Listo
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.fullscreenMap}>
              {renderMap(true)}
              {userLocation && (
                <TouchableOpacity
                  style={styles.locateButton}
                  onPress={centerOnUser}
                  testID={`${testID}-fullscreen-locate`}
                  accessibilityRole="button"
                  accessibilityLabel="Centrar en mi ubicación"
                >
                  <Feather
                    name="crosshair"
                    size={18}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.fullscreenHint}>
              Arrastrá el pin o tocá el mapa para ajustar la ubicación.
            </Text>
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
  locateButton: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: borderRadius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  hintText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    textAlign: "center",
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
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  fullscreenDone: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  fullscreenMap: {
    flex: 1,
    position: "relative",
  },
  fullscreenHint: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
});

export default LocationMapPicker;
