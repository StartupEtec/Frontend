import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

interface ProfessionalListItemProps {
  avatarUri?: string;
  name: string;
  rating?: number;
  specialty?: string;
  onPress: () => void;
  testID?: string;
  accentColor?: string;
}

export const ProfessionalListItem: React.FC<ProfessionalListItemProps> = ({
  avatarUri,
  name,
  rating,
  specialty,
  onPress,
  testID,
  accentColor = colors.primary,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      {avatarUri ? (
        <Image
          source={{ uri: avatarUri }}
          style={styles.avatar}
        />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Feather name="user" size={24} color={colors.textMuted} accessible={false} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {rating != null && (
          <View style={styles.ratingRow}>
            <Feather name="star" size={14} color={accentColor} accessible={false} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
        )}
        {specialty && <Text style={styles.specialty}>{specialty}</Text>}
      </View>
      <Feather name="chevron-right" size={18} color={colors.textMuted} accessible={false} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  info: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  ratingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  specialty: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
  },
});
