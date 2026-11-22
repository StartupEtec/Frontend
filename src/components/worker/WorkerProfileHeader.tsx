import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NearbyWorker } from '../../types/worker';
import { toDisplayUri } from '../../services/profileService';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

export interface WorkerProfileHeaderProps {
  worker: NearbyWorker;
  profileName?: string | null;
}

/** Avatar grande, nombre, categoría(s) y badges de estado/certificación. */
export const WorkerProfileHeader: React.FC<WorkerProfileHeaderProps> = ({
  worker,
  profileName,
}) => {
  const avatarUri = toDisplayUri(worker.avatar_url);
  const name = profileName ?? worker.full_name;

  // Nombres de categorías: preferir el arreglo si viene, sino usar el único.
  const categoryNames: string[] = worker.category_names
    ? worker.category_names.filter(Boolean)
    : worker.category_name
      ? [worker.category_name]
      : [];

  const isAvailable = worker.availability_status === 'AVAILABLE';
  const isCertified = worker.certification_status === 'APPROVED';

  return (
    <View style={styles.hero}>
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Feather name="user" size={40} color={colors.textMuted} />
        </View>
      )}
      <Text style={styles.name}>{name}</Text>
      {categoryNames.length > 0 && (
        <View style={styles.categoryRow}>
          {categoryNames.map((cat, index) => (
            <View key={index} style={styles.categoryTag}>
              <Text style={styles.categoryText}>{cat}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.badgesRow}>
        <View style={[styles.badge, isAvailable ? styles.badgeAvailable : styles.badgeUnavailable]}>
          <Text
            style={[
              styles.badgeText,
              isAvailable ? styles.badgeTextAvailable : styles.badgeTextUnavailable,
            ]}
          >
            {isAvailable ? 'Disponible' : 'No disponible'}
          </Text>
        </View>
        {isCertified && (
          <View style={[styles.badge, styles.badgeCertified]}>
            <Text style={[styles.badgeText, styles.badgeTextAvailable]}>Certificado</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarFallback: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
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
  badgesRow: { flexDirection: 'row', gap: spacing.sm },
  badge: {
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    minWidth: 70,
    alignItems: 'center',
  },
  badgeAvailable: {
    backgroundColor: colors.workerAccent,
  },
  badgeUnavailable: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeCertified: {
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
  badgeTextAvailable: { color: colors.onPrimary },
  badgeTextUnavailable: { color: colors.textPrimary },
});
