import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatRating } from '../../utils/rating';
import { colors, typography } from '../../theme/tokens';

export interface WorkerRatingSummaryProps {
  rating?: string | null;
  totalReviews?: number | null;
}

/** Resumen de calificación: valor y cantidad de reseñas (sin estrellas). */
export const WorkerRatingSummary: React.FC<WorkerRatingSummaryProps> = ({
  rating,
  totalReviews,
}) => {
  const ratingValue = formatRating(rating ?? null);

  return (
    <View style={styles.container} accessibilityLabel="Calificación del trabajador">
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
  container: { alignItems: 'center' },
  textRow: { flexDirection: 'column', justifyContent: 'center', gap: 2 },
  value: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  count: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },
});
