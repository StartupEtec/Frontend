import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';

export type WorkerProfileTab = 'profile' | 'reviews';

export interface WorkerProfileTabsProps {
  active: WorkerProfileTab;
  reviewCount: number;
  onSwitch: (tab: WorkerProfileTab) => void;
}

/** Pestañas "Perfil" / "Reseñas (N)". */
export const WorkerProfileTabs: React.FC<WorkerProfileTabsProps> = ({
  active,
  reviewCount,
  onSwitch,
}) => {
  const reviewLabel = `Reseñas (${reviewCount})`;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, active === 'profile' && styles.tabActive]}
        onPress={() => onSwitch('profile')}
        testID="tab-profile"
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'profile' }}
        accessibilityLabel={`Perfil ${active === 'profile' ? 'seleccionado' : ''}`}
      >
        <Text style={[styles.tabLabel, active === 'profile' && styles.tabLabelActive]}>Perfil</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, active === 'reviews' && styles.tabActive]}
        onPress={() => onSwitch('reviews')}
        testID="tab-reviews"
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'reviews' }}
        accessibilityLabel={reviewLabel}
      >
        <Text style={[styles.tabLabel, active === 'reviews' && styles.tabLabelActive]}>
          {reviewLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.md,
    fontWeight: '500' as const,
  },
  tabLabelActive: { color: colors.primary, fontWeight: '600' as const },
});
