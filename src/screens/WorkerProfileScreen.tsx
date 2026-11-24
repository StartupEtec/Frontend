import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { UserRole } from '../types/role';
import { NearbyWorker } from '../types/worker';
import { SavedLocation } from '../types/location';
import { ApiError } from '../services/api';
import { distanceKmBetween, formatDistance } from '../utils/map';
import { colors, spacing, borderRadius, typography, shadows, roleAccent } from '../theme/tokens';
import { WorkerProfileHeader } from '../components/worker/WorkerProfileHeader';
import { WorkerRatingSummary } from '../components/worker/WorkerRatingSummary';
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
  /** Navega a la pantalla de conversación (chat). */
  onNavigateToConversation?: (userId: string) => void;
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
 * Muestra: avatar grande, nombre, categoría(s), calificación, número de
 * reseñas, distancia desde la ubicación del cliente, y tres secciones
 * colapsables: "Acerca de" (biografía), "Galería" (trabajos anteriores)
 * y "Reseñas" (valoraciones de clientes).
 *
 * El botón "Solicitar Servicio" queda fijo abajo siempre visible.
 *
 * Los datos básicos vienen de la búsqueda (`worker`); la bio y el rating
 * fresco se cargan con GET /users/:id. Las reseñas se cargan con
 * GET /users/:id/ratings.
 */
export const WorkerProfileScreen: React.FC<WorkerProfileScreenProps> = ({
  worker,
  origin,
  role = 'client',
  onGoBack,
  onNavigateToConversation,
}) => {
  const accentColor = roleAccent(role);
  const insets = useSafeAreaInsets();

  const [aboutExpanded, setAboutExpanded] = useState(true);
  const [galleryExpanded, setGalleryExpanded] = useState(true);
  const [reviewsExpanded, setReviewsExpanded] = useState(true);

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

  const portfolio = profile?.portfolio ?? null;

  const toggleSection = useCallback((section: 'about' | 'gallery' | 'reviews') => {
    if (section === 'about') setAboutExpanded((prev) => !prev);
    if (section === 'gallery') setGalleryExpanded((prev) => !prev);
    if (section === 'reviews') setReviewsExpanded((prev) => !prev);
  }, []);

  const handleRequestService = useCallback(() => {
    if (onNavigateToConversation) {
      void onNavigateToConversation(worker.user_id);
    }
  }, [worker.user_id, onNavigateToConversation]);

  const handleRetry = useCallback(() => {
    void reload();
  }, [reload]);

  const showErrorScreen = notFound || status === 'error';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: spacing.sm + insets.top }]}>
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
          >
            <Text style={[styles.backArrow, { color: accentColor }]}>← Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <WorkerProfileHeader worker={worker} profileName={profileName} />

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

            {/* Sección: Acerca de */}
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                onPress={() => toggleSection('about')}
                style={styles.sectionTitleRow}
                testID="section-about-header"
                accessibilityRole="button"
                accessibilityLabel={`Acerca de ${aboutExpanded ? 'cerrado' : 'abierto'}`}
              >
                <Text style={[styles.sectionTitle, { color: accentColor }]}>Acerca de</Text>
                <Text style={[styles.sectionChevron]}>{aboutExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {aboutExpanded && (
                <View style={styles.sectionContent}>
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
                </View>
              )}
            </View>

            {/* Sección: Galería */}
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                onPress={() => toggleSection('gallery')}
                style={styles.sectionTitleRow}
                testID="section-gallery-header"
                accessibilityRole="button"
                accessibilityLabel={`Galería ${galleryExpanded ? 'cerrada' : 'abierta'}`}
              >
                <Text style={[styles.sectionTitle, { color: accentColor }]}>Galería</Text>
                <Text style={[styles.sectionChevron]}>{galleryExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {galleryExpanded && (
                <View style={styles.sectionContent}>
                  <WorkerPortfolioGallery portfolio={portfolio} accentColor={accentColor} />
                </View>
              )}
            </View>

            {/* Sección: Reseñas */}
            <View style={styles.sectionContainer}>
              <TouchableOpacity
                onPress={() => toggleSection('reviews')}
                style={styles.sectionTitleRow}
                testID="section-reviews-header"
                accessibilityRole="button"
                accessibilityLabel={`Reseñas ${reviewsExpanded ? 'cerradas' : 'abiertas'}`}
              >
                <Text style={[styles.sectionTitle, { color: accentColor }]}>
                  Reseñas ({totalReviews})
                </Text>
                <Text style={[styles.sectionChevron]}>{reviewsExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {reviewsExpanded && (
                <View style={styles.sectionContent}>
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
                      <Text style={styles.reviewsEmptyIcon}>☆</Text>
                      <Text style={styles.reviewsEmptyText}>
                        Este trabajador aún no tiene reseñas.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {reviews.map((review) => (
                        <WorkerReviewCard
                          key={review.id}
                          review={review}
                          accentColor={accentColor}
                        />
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
              )}
            </View>
          </ScrollView>

          {/* Botón fijo abajo, siempre visible */}
          <SafeAreaView edges={['bottom']} style={styles.requestButtonContainer}>
            <TouchableOpacity
              style={[styles.requestButton, { backgroundColor: accentColor }]}
              onPress={handleRequestService}
              testID="btn-profile-request"
              accessibilityRole="button"
              accessibilityLabel="Solicitar servicio"
            >
              <Text style={styles.requestButtonText}>Solicitar Servicio</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </>
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
  sectionContainer: {
    marginTop: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs / 2,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  sectionChevron: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  sectionContent: {
    marginTop: spacing.sm,
    gap: spacing.sm,
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
  reviewsEmptyIcon: {
    fontSize: 32,
    color: colors.textMuted,
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
  requestButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  requestButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    width: '100%',
    ...shadows.button,
  },
  requestButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});
