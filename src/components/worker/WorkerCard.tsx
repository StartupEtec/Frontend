import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { NearbyWorker } from "../../types/worker";
import { toDisplayUri } from "../../services/profileService";
import { formatDistance } from "../../utils/map";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from "../../theme/tokens";

export interface WorkerCardProps {
  worker: NearbyWorker;
  accentColor?: string;
  /** Si se pasa, muestra el botón "Ver Perfil Completo". */
  onViewProfile?: () => void;
  /** Si se pasa, muestra el botón "Solicitar Servicio". */
  onRequestService?: () => void;
  testID?: string;
}

/** "4.5" → "4,5" (formato es-AR); null si no hay valoraciones. */
function formatRating(value: string | null): string | null {
  if (value == null) return null;
  const rating = Number(value);
  if (!Number.isFinite(rating)) return null;
  return rating.toFixed(1).replace(".", ",");
}

/**
 * Tarjeta resumida de un trabajador: nombre, calificación, categoría y
 * distancia. Se usa en la lista y en la ficha superpuesta al mapa
 * (al tocar un pin). Con callbacks muestra las acciones del DoD:
 * "Ver Perfil Completo" y "Solicitar Servicio".
 */
export const WorkerCard: React.FC<WorkerCardProps> = ({
  worker,
  accentColor = colors.primary,
  onViewProfile,
  onRequestService,
  testID,
}) => {
  const avatarUri = toDisplayUri(worker.avatar_url);
  const rating = formatRating(worker.average_rating);

  return (
    <View
      style={styles.card}
      testID={testID ?? `worker-card-${worker.worker_id}`}
    >
      <View style={styles.headerRow}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Feather name="user" size={20} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.headerTexts}>
          <Text style={styles.name} numberOfLines={1}>
            {worker.full_name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.rating}>
              {rating ? `★ ${rating}` : "Sin valoraciones"}
            </Text>
            {worker.distance_km >= 0 && (
              <Text style={styles.metaDot}>
                {" · "}
                {formatDistance(worker.distance_km * 1000)}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.tagsRow}>
        {worker.category_name && (
          <View style={styles.tag}>
            <Text style={styles.tagText} numberOfLines={1}>
              {worker.category_name}
            </Text>
          </View>
        )}
      </View>

      {(onViewProfile || onRequestService) && (
        <View style={styles.actionsRow}>
          {onViewProfile && (
            <TouchableOpacity
              style={[styles.profileButton, { backgroundColor: accentColor }]}
              onPress={onViewProfile}
              testID={`btn-worker-profile-${worker.worker_id}`}
              accessibilityRole="button"
              accessibilityLabel={`Ver perfil completo de ${worker.full_name}`}
            >
              <Text style={styles.profileButtonText}>Ver Perfil Completo</Text>
            </TouchableOpacity>
          )}
          {onRequestService && (
            <TouchableOpacity
              style={[styles.requestButton, { borderColor: accentColor }]}
              onPress={onRequestService}
              testID={`btn-worker-request-${worker.worker_id}`}
              accessibilityRole="button"
              accessibilityLabel={`Solicitar servicio a ${worker.full_name}`}
            >
              <Text style={[styles.requestButtonText, { color: accentColor }]}>
                Solicitar Servicio
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarFallback: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTexts: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  rating: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  metaDot: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    maxWidth: 200,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  profileButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  profileButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  requestButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1.5,
    backgroundColor: colors.cardBackground,
  },
  requestButtonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default WorkerCard;
