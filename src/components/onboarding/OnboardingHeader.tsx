import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { OnboardingHeaderProps } from '../../types/onboarding';
import { onboardingUIStrings } from '../../i18n/onboardingContent';
import { colors, spacing, typography } from '../../theme/tokens';

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({ onSkip, showSkip }) => {
  return (
    <View style={styles.container}>
      {showSkip ? (
        <TouchableOpacity
          onPress={onSkip}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel={onboardingUIStrings.skip}
          accessibilityHint={onboardingUIStrings.accessibility.skipHint}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>{onboardingUIStrings.skip}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 56,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  skipButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  placeholder: {
    width: 60,
  },
});
