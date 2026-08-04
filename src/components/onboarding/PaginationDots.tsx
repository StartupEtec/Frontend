import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PaginationDotsProps } from '../../types/onboarding';
import { colors, spacing, borderRadius } from '../../theme/tokens';

export const PaginationDots: React.FC<PaginationDotsProps> = ({ total, currentIndex }) => {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === currentIndex;
        return (
          <View
            key={`dot-${index}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Slide ${index + 1} de ${total}`}
            style={[
              styles.dot,
              isActive ? styles.dotActive : styles.dotInactive,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  dot: {
    height: 8,
    borderRadius: borderRadius.pill,
    marginHorizontal: spacing.xs,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.dotInactive,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.dotActive,
  },
});
