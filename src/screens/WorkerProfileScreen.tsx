import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { NearbyWorker, PublicWorkerProfile } from "../types/worker";
import { SavedLocation } from "../types/location";
import { userService } from "../services/userService";
import { toDisplayUri } from "../services/profileService";
import { ApiError } from "../services/api";
import { coverageTier, distanceKmBetween, formatDistance } from "../utils/map";
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  roleAccent,
} from "../theme/tokens";

export interface WorkerProfileScreenProps {
  /** Trabajador elegido en la búsqueda (trae categoría y distancia). */
  worker: NearbyWorker;
  /** Ubicación guardada desde la que se buscó: referencia del indicador de
   * cobertura (la misma que colorea el pin en el mapa). */
  origin?: SavedLocation | null;
  role?: UserRole;
  onGoBack: () => void;
}

type ProfileStatus = "loading" | "success" | "error";

/** "4.5" → "4,5"; null si no hay valoraciones. */
function formatRating(value: string | null): string | null {
  if (value == null) return null;
  const rating = Number(value);
  if (!Number.isFinite(rating)) return null;
  return rating.toFixed(1).replace(".", ",");
}

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * Perfil público de un trabajador (Issue #24): ficha mínima con avatar,
 * nombre, categoría, calificación, distancia, biografía y botón
 * "Solicitar Servicio".
 *
 * Los datos básicos vienen de la búsqueda (`worker`); la biografía y el
 * rating fresco se cargan con GET /users/:id (perfil público, sin auth).
 */
export const WorkerProfileScreen: React.FC<WorkerProfileScreenProps> = ({
  worker,
  origin,
  role = "client",
  onGoBack,
}) => {
  const accentColor = roleAccent(role);
  const [profile, setProfile] = useState<PublicWorkerProfile | null>(null);
  const [status, setStatus] = useState<ProfileStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const result = await userService.getPublicProfile(worker.user_id);
      setProfile(result);
      setStatus("success");
    } catch (err: unknown) {
      setError(messageFor(err, "No pudimos cargar el perfil. Reintentá."));
      setStatus("error");
    }
  }, [worker.user_id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleRequestService = useCallback(() => {
    Alert.alert(
      "Próximamente",
      "El flujo de cotización de servicios estará disponible en una próxima versión.",
    );
  }, []);

  const avatarUri = toDisplayUri(worker.avatar_url);
  const rating =
    formatRating(profile?.average_rating ?? worker.average_rating) ?? null;

  // ¿Llega el trabajador hasta la ubicación que elegiste para buscar? La
  // referencia es esa ubicación guardada (misma que colorea los pines del
  // mapa); sin ella se usa la distancia que trae la búsqueda (medida desde
  // el centro de búsqueda).
  const coverageDistanceKm = origin
    ? distanceKmBetween(
        { latitude: origin.latitude, longitude: origin.longitude },
        worker,
      )
    : worker.distance_km;
  const tier = coverageTier(coverageDistanceKm, worker.coverage_radius_km);

  let coverageText: string;
  let coverageColor: string;
  if (tier === "in") {
    coverageText = "Estás en su área de cobertura";
    coverageColor = colors.workerAccent;
  } else if (tier === "unknown") {
    coverageText = "Este trabajador no definió su área de cobertura";
    coverageColor = colors.textMuted;
  } else {
    const limitGap = formatDistance(
      (coverageDistanceKm - (worker.coverage_radius_km ?? 0)) * 1000,
    );
    coverageText =
      tier === "near"
        ? `Fuera de su área por poco (a ${limitGap} del límite)`
        : `Fuera de su área de cobertura (a ${limitGap} del límite)`;
    coverageColor =
      tier === "near" ? colors.workerAccentDim : colors.textSecondary;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onGoBack}
          style={styles.backButton}
          testID="btn-profile-back"
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={[styles.backArrow, { color: accentColor }]}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Perfil del Trabajador</Text>
        <View style={styles.headerSpacer} />
      </View>

      {status === "error" ? (
        <View style={styles.center}>
          <Text style={styles.errorText} testID="profile-error">
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: accentColor }]}
            onPress={() => {
              void loadProfile();
            }}
            testID="btn-profile-retry"
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Feather name="user" size={36} color={colors.textMuted} />
              </View>
            )}
            <Text style={styles.name}>{worker.full_name}</Text>
            {worker.category_name && (
              <View style={styles.categoryTag}>
                <Text style={styles.categoryText}>{worker.category_name}</Text>
              </View>
            )}
            <View style={styles.badgesRow}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: colors.successContainer },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: colors.onSuccessContainer },
                  ]}
                >
                  Disponible
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: accentColor }]}>
                <Text style={[styles.badgeText, { color: colors.onPrimary }]}>
                  Certificado
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {rating ? `★ ${rating}` : "—"}
              </Text>
              <Text style={styles.statLabel}>
                {rating ? "Calificación" : "Sin valoraciones"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {formatDistance(worker.distance_km * 1000) || "—"}
              </Text>
              <Text style={styles.statLabel}>Distancia</Text>
            </View>
          </View>

          {/* Indicador chico de relación con el área de cobertura. */}
          <View style={styles.coverageRow} testID="profile-coverage">
            <View
              style={[styles.coverageDot, { backgroundColor: coverageColor }]}
            />
            <Text style={[styles.coverageText, { color: coverageColor }]}>
              {coverageText}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Acerca de</Text>
          {status === "loading" ? (
            <View style={styles.bioLoading}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={styles.bioLoadingText}>Cargando perfil...</Text>
            </View>
          ) : (
            <Text style={styles.bio} testID="profile-bio">
              {profile?.bio
                ? profile.bio
                : "Este trabajador aún no agregó una biografía."}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.requestButton, { backgroundColor: accentColor }]}
            onPress={handleRequestService}
            testID="btn-profile-request"
            accessibilityRole="button"
            accessibilityLabel="Solicitar servicio"
          >
            <Text style={styles.requestButtonText}>Solicitar Servicio</Text>
          </TouchableOpacity>
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
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarFallback: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    textAlign: "center",
  },
  categoryTag: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  badgesRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  badge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  badgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingHorizontal: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.cardStroke,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    textAlign: "center",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    textAlign: "center",
  },
  coverageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  coverageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  coverageText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    marginTop: spacing.xs,
  },
  bioLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bioLoadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  bio: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
  requestButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
    ...shadows.button,
  },
  requestButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default WorkerProfileScreen;
