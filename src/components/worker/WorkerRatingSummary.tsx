import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WorkerStars } from './WorkerStars';
import { formatRating, ratingStars } from '../../utils/rating';
import { colors, spacing, typography } from '../../theme/tokens';

export interface WorkerRatingSummaryProps {
  rating?: string | null;
  totalReviews?: number | null;
  accentColor?: string;
}

/** Resumen de calificación: estrellas + promedio + cantidad de reseñas. */
export const WorkerRatingSummary: React.FC<WorkerRatingSummaryProps> = ({
  rating,
  totalReviews,
  accentColor = colors.primary,
}) => {
  const ratingValue = formatRating(rating ?? null);
  const stars = ratingStars(rating ? Number(rating) : null);

  return (
    <View style={styles.container} accessibilityLabel="Calificación del trabajador">
      <WorkerStars stars={stars} size={18} activeColor={accentColor} />
      <View style={styles.textRow}>
        <Text style={styles.value}>{ratingValue ? `★ ${ratingValue}` : 'Sin valoraciones'}</Text>
        {totalReviews != null && (
          <Text style={styles.count}>
            {totalReviews === 0
              ? 'Sin reseñas'
              : totalReviews === 1
                ? '1 reseña'
                : `${totalReviews} reseñas`}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  textRow: { flexDirection: 'column', justifyContent: 'center' },
  value: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  count: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },
});
