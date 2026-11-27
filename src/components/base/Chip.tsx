import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

interface ChipProps {
  label: string;
  backgroundColor?: string;
  textColor?: string;
  testID?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  backgroundColor = colors.tertiaryFixed,
  textColor = colors.onTertiaryFixed,
  testID,
}) => {
  return (
    <View style={[styles.chip, { backgroundColor }]} testID={testID}>
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
});
