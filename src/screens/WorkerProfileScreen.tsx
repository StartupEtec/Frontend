import React, { useCallback, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { UserRole } from '../types/role';
import { NearbyWorker } from '../types/worker';
import { SavedLocation } from '../types/location';
import { ApiError } from '../services/api';
import { distanceKmBetween, formatDistance } from '../utils/map';
import { colors, spacing, borderRadius, typography, shadows, roleAccent } from '../theme/tokens';
import { WorkerProfileHeader } from '../components/worker/WorkerProfileHeader';
import { WorkerRatingSummary } from '../components/worker/WorkerRatingSummary';
import { WorkerProfileTabs, WorkerProfileTab } from '../components/worker/WorkerProfileTabs';
import { WorkerReviewCard } from '../components/worker/WorkerReviewCard';
import { WorkerPortfolioGallery } from '../components/worker/WorkerPortfolioGallery';
import { useWorkerProfile } from '../hooks/useWorkerProfile';
import { useWorkerReviews } from '../hooks/useWorkerReviews';

export interface WorkerProfileScreenProps {
  /** Trabajador elegido en la búsqueda (trae categoría y distancia). */
  worker: NearbyWorker;
  /** Ubicación guardada desde la que se buscó: referencia para calcular la distancia. */
  origin?: SavedLocation | null;
  role?: UserRole;
  onGoBack: () => void;
}

/** "4.5" → "4,5"; null si no hay valoraciones. */
function formatRating(value: string | null): string | null {
  if (value == null) return null;
  const rating = Number(value);
  if (!Number.isFinite(rating)) return null;
  return rating.toFixed(1).replace('.', ',');
}

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * Perfil público de un trabajador (Issue #26): ficha del trabajador vista
 * desde el cliente.
 *
 * Muestra: avatar grande, nombre, categoría, calificación, número de
 * reseñas, distancia desde la ubicación del cliente, biografía, galería
 * de trabajos anteriores (placeholder si no hay) y un único botón
 * "Solicitar Servicio" (abre "Próximamente": el flujo de cotización es un
 * issue futuro).
 *
 * Los datos básicos vienen de la búsqueda (`worker`); la bio y el rating
 * fresco se cargan con GET /users/:id. Las reseñas se cargan con
 * GET /users/:id/ratings.
 *
 * Quedan pendientes de backend: tarifa horaria, horarios de disponibilidad
 * (endpoint sólo del dueño) y galería real de trabajos anteriores.
 */
export const WorkerProfileScreen: React.FC<WorkerProfileScreenProps> = ({
  worker,
  origin,
  role = 'client',
  onGoBack,
}) => {
  const accentColor = roleAccent(role);
  const [tab, setTab] = useState<WorkerProfileTab>('profile');

  const { profile, status, error, notFound, reload } = useWorkerProfile(worker.user_id);
  const { reviews, total, reviewsStatus, reviewsError, loadMore, loadMoreError, hasMore } =
    useWorkerReviews(worker.user_id);

  const profileName = profile?.full_name ?? worker.full_name;
  const bio = profile?.bio ?? null;
  const rating = formatRating(profile?.average_rating ?? worker.average_rating) ?? null;
  const totalReviews = total ?? 0;
  const distanceKm = origin
    ? distanceKmBetween({ latitude: origin.latitude, longitude: origin.longitude }, worker)
    : worker.distance_km;

  const handleRequestService = useCallback(() => {
    Alert.alert(
      'Próximamente',
      'El flujo de cotización de servicios estará disponible en una próxima versión.'
    );
  }, []);

  const handleRetry = useCallback(() => {
    void reload();
  }, [reload]);

  const showErrorScreen = notFound || status === 'error';

  const portfolio = profile?.portfolio ?? null;

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

      {showErrorScreen ? (
        <View style={styles.center}>
          <Text style={styles.errorText} testID="profile-error">
            {notFound
              ? 'Trabajador no encontrado.'
              : (error ?? messageFor(null, 'No pudimos cargar el perfil.'))}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: accentColor }]}
            onPress={handleRetry}
            testID="btn-profile-retry"
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onGoBack}
            testID="btn-profile-back-from-error"
            accessibilityRole="button"
            accessibilityLabel="Volver"
            marginTop={spacing.sm}
          >
            <Text style={[styles.backArrow, { color: accentColor }]}>← Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <WorkerProfileHeader
            worker={worker}
            profileName={profileName}
            accentColor={accentColor}
          />

          <View style={styles.statsCard}>
            <View style={styles.stat}>
              <WorkerRatingSummary
                rating={rating}
                totalReviews={totalReviews}
                accentColor={accentColor}
              />
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDistance(distanceKm * 1000) || '—'}</Text>
              <Text style={styles.statLabel}>Distancia</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Acerca de</Text>
          {status === 'loading' ? (
            <View style={styles.bioLoading}>
              <ActivityIndicator size="small" color={accentColor} />
              <Text style={styles.bioLoadingText}>Cargando perfil...</Text>
            </View>
          ) : (
            <Text style={styles.bio} testID="profile-bio">
              {bio ? bio : 'Este trabajador aún no agregó una biografía.'}
            </Text>
          )}

          <WorkerPortfolioGallery portfolio={portfolio} accentColor={accentColor} />

          <WorkerProfileTabs
            active={tab}
            reviewCount={totalReviews}
            onSwitch={setTab}
            accentColor={accentColor}
          />

          {tab === 'reviews' ? (
            <View style={styles.reviewsSection}>
              {reviewsStatus === 'loading' ? (
                <View style={styles.reviewsLoading}>
                  <ActivityIndicator size="small" color={accentColor} />
                  <Text style={styles.reviewsLoadingText}>Cargando reseñas...</Text>
                </View>
              ) : reviewsStatus === 'error' ? (
                <View style={styles.reviewsError}>
                  <Text style={styles.reviewsErrorText} testID="profile-reviews-error">
                    {reviewsError ?? 'No pudimos cargar las reseñas.'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: accentColor }]}
                    onPress={handleRetry}
                    testID="btn-profile-reviews-retry"
                    accessibilityRole="button"
                  >
                    <Text style={styles.retryText}>Reintentar reseñas</Text>
                  </TouchableOpacity>
                </View>
              ) : reviews.length === 0 ? (
                <View style={styles.reviewsEmpty}>
                  <Feather name="star" size={28} color={colors.textMuted} />
                  <Text style={styles.reviewsEmptyText}>Este trabajador aún no tiene reseñas.</Text>
                </View>
              ) : (
                <>
                  {reviews.map((review) => (
                    <WorkerReviewCard key={review.id} review={review} accentColor={accentColor} />
                  ))}
                  {hasMore && (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={loadMore}
                      testID="btn-profile-reviews-load-more"
                      accessibilityRole="button"
                      accessibilityLabel="Ver más reseñas"
                    >
                      <Text style={styles.loadMoreText}>Ver más reseñas</Text>
                      {loadMoreError && (
                        <Text style={styles.loadMoreErrorText}>{loadMoreError}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          ) : null}

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backArrow: { fontSize: 24, fontWeight: 'bold' },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.md,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
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
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
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
    textAlign: 'center',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    textAlign: 'center',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    marginTop: spacing.xs,
  },
  bioLoading: {
    flexDirection: 'row',
    alignItems: 'center',
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
  reviewsSection: { gap: spacing.sm },
  reviewsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  reviewsLoadingText: { color: colors.textSecondary, fontSize: typography.fontSizes.sm },
  reviewsError: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  reviewsErrorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
  reviewsEmpty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  reviewsEmptyText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  loadMoreText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  loadMoreErrorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs / 2,
  },
  requestButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.button,
  },
  requestButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default WorkerProfileScreen;
