import React from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WorkerReview } from '../../types/rating';
import { WorkerStars } from './WorkerStars';
import { toDisplayUri } from '../../services/profileService';
import { formatRating, formatReviewDate } from '../../utils/rating';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

export interface WorkerReviewCardProps {
  review: WorkerReview;
  accentColor?: string;
}

/** Tarjeta de una reseña: autor, estrellas, fecha y texto. */
export const WorkerReviewCard: React.FC<WorkerReviewCardProps> = ({
  review,
  accentColor = colors.primary,
}) => {
  const avatarUri = toDisplayUri(review.rater.avatar_url);
  const ratingText = formatRating(review.rating_stars);

  return (
    <View style={[styles.card, { borderLeftColor: accentColor }]}>
      <View style={styles.headerRow}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Feather name="user" size={20} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.headerTexts}>
          <Text style={styles.author}>{review.rater.full_name ?? 'Anónimo'}</Text>
          <View style={styles.metaRow}>
            <WorkerStars
              rating={review.rating_stars}
              size={14}
              activeColor={accentColor}
              showValue
              valueText={ratingText ?? 'Sin valoración'}
            />
            <Text style={styles.date}>{formatReviewDate(review.created_at)}</Text>
          </View>
        </View>
      </View>
      {review.review_text && (
        <View style={styles.body}>
          <Text style={styles.text}>{review.review_text}</Text>
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
    marginBottom: spacing.md,
    ...(colors.background === '#f9f9f9' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  avatarFallback: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: { flex: 1, gap: 2 },
  author: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  date: { color: colors.textMuted, fontSize: typography.fontSizes.xs },
  body: {},
  text: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
  },
});
