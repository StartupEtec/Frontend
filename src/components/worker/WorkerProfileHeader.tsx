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

/** Avatar grande, nombre, categoría y badges de estado/certificación. */
export const WorkerProfileHeader: React.FC<WorkerProfileHeaderProps> = ({
  worker,
  profileName,
}) => {
  const avatarUri = toDisplayUri(worker.avatar_url);
  const name = profileName ?? worker.full_name;

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
      {worker.category_name && (
        <View style={styles.categoryTag}>
          <Text style={styles.categoryText}>{worker.category_name}</Text>
        </View>
      )}
      <View style={styles.badgesRow}>
        <View style={[styles.badge]}>
          <Text style={styles.badgeText}>
            {worker.availability_status === 'AVAILABLE' ? 'Disponible' : 'No disponible'}
          </Text>
        </View>
        {worker.certification_status === 'APPROVED' && (
          <View style={[styles.badge]}>
            <Text style={[styles.badgeText, { color: colors.onPrimary }]}>Certificado</Text>
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
  },
  badgeText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
});
