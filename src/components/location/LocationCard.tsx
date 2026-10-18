import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SavedLocation } from "../../types/location";
import { formatDistance } from "../../utils/map";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../../theme/tokens";

interface LocationCardProps {
  location: SavedLocation;
  /** Se está eliminando esta ubicación. */
  deleting?: boolean;
  /** Hay una operación en curso (para deshabilitar acciones). */
  busy?: boolean;
  accentColor?: string;
  onEdit: () => void;
  onDelete: () => void;
  /** Solo se muestra si la ubicación no es la principal. */
  onSetPrimary?: () => void;
  /** Para decidir si mostrar info de trabajador. */
  role?: string | null;
}

/** Ítem de la lista de ubicaciones guardadas: dirección, badge y acciones. */
export const LocationCard: React.FC<LocationCardProps> = ({
  location,
  deleting = false,
  busy = false,
  accentColor = colors.primary,
  onEdit,
  onDelete,
  onSetPrimary,
  role,
}) => {
  const distance = formatDistance(location.distance_m);

  return (
    <View style={styles.card} testID={`location-card-${location.id}`}>
      <View style={styles.header}>
        <Feather
          name="map-pin"
          size={18}
          color={accentColor}
          accessible={false}
        />
        <View style={styles.headerText}>
          <Text
            style={styles.address}
            numberOfLines={2}
            testID={`location-address-${location.id}`}
          >
            {location.address}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.coords}>
              {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </Text>
            {distance.length > 0 && (
              <Text
                style={[styles.distance, { color: accentColor }]}
                testID={`location-distance-${location.id}`}
              >
                · {distance}
              </Text>
            )}
          </View>
        </View>
        {location.is_primary && (
          <View
            style={[styles.badge, { backgroundColor: accentColor }]}
            testID={`location-primary-${location.id}`}
          >
            <Text style={styles.badgeText}>Principal</Text>
          </View>
        )}
      </View>

      {role === "worker" &&
        location.coverage_radius_km != null &&
        location.coverage_radius_km > 0 && (
          <Text
            style={styles.radiusText}
            testID={`location-radius-${location.id}`}
          >
            Cobertura:{" "}
            {location.coverage_radius_km.toFixed(1).replace(".", ",")} km
          </Text>
        )}

      <View style={styles.actions}>
        {!location.is_primary && onSetPrimary && (
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={onSetPrimary}
            disabled={busy || deleting}
            testID={`btn-set-primary-${location.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Marcar ${location.address} como principal`}
          >
            <Feather
              name="star"
              size={15}
              color={accentColor}
              accessible={false}
            />
            <Text style={[styles.primaryActionText, { color: accentColor }]}>
              Hacer principal
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.spacer} />

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onEdit}
          disabled={busy || deleting}
          testID={`btn-edit-location-${location.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Editar ${location.address}`}
        >
          <Feather
            name="edit-2"
            size={16}
            color={colors.textSecondary}
            accessible={false}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={onDelete}
          disabled={deleting}
          testID={`btn-delete-location-${location.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${location.address}`}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Feather
              name="trash-2"
              size={16}
              color={colors.error}
              accessible={false}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  address: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.medium,
  },
  coords: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  distance: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginTop: 2,
    marginLeft: 4,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  badgeText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  radiusText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  primaryActionText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  spacer: {
    flex: 1,
  },
  iconButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
});

export default LocationCard;
