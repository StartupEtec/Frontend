import React from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WorkerPortfolioItem } from '../../types/worker';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

export interface WorkerPortfolioGalleryProps {
  portfolio?: WorkerPortfolioItem[] | null;
}

/** Galería horizontal de trabajos anteriores. Si no hay, muestra placeholder. */
export const WorkerPortfolioGallery: React.FC<WorkerPortfolioGalleryProps> = ({ portfolio }) => {
  const items = portfolio ?? [];

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="image" size={28} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          Este trabajador todavía no publicó trabajos anteriores.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Trabajos anteriores</Text>
      <View style={styles.gallery}>
        {items.map((item) => (
          <View key={item.id} style={styles.galleryItem}>
            <Image source={{ uri: item.image_url }} style={styles.image} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.sm,
  },
  gallery: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  galleryItem: { width: 120, height: 120, borderRadius: borderRadius.md },
  image: { width: '100%', height: '100%', borderRadius: borderRadius.md },
});
