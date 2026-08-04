import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { OnboardingFooterProps } from '../../types/onboarding';
import { PaginationDots } from './PaginationDots';
import { onboardingUIStrings } from '../../i18n/onboardingContent';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme/tokens';

export const OnboardingFooter: React.FC<OnboardingFooterProps> = ({
  currentIndex,
  totalSlides,
  onNext,
  onPrev,
  onRegister,
  onLogin,
}) => {
  const isLastSlide = currentIndex === totalSlides - 1;
  const isFirstSlide = currentIndex === 0;

  if (isLastSlide) {
    return (
      <View style={styles.container}>
        <PaginationDots total={totalSlides} currentIndex={currentIndex} />
        
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            onPress={onRegister}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={onboardingUIStrings.register}
            accessibilityHint={onboardingUIStrings.accessibility.registerHint}
            style={[styles.button, styles.primaryButton]}
          >
            <Text style={styles.primaryButtonText}>{onboardingUIStrings.register}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onLogin}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={onboardingUIStrings.login}
            accessibilityHint={onboardingUIStrings.accessibility.loginHint}
            style={[styles.button, styles.secondaryButton]}
          >
            <Text style={styles.secondaryButtonText}>{onboardingUIStrings.login}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PaginationDots total={totalSlides} currentIndex={currentIndex} />

      <View style={styles.navRow}>
        {!isFirstSlide ? (
          <TouchableOpacity
            onPress={onPrev}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={onboardingUIStrings.prev}
            accessibilityHint={onboardingUIStrings.accessibility.prevHint}
            style={[styles.navButton, styles.prevButton]}
          >
            <Text style={styles.prevButtonText}>{onboardingUIStrings.prev}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.navButtonPlaceholder} />
        )}

        <TouchableOpacity
          onPress={onNext}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={onboardingUIStrings.next}
          accessibilityHint={onboardingUIStrings.accessibility.nextHint}
          style={[styles.navButton, styles.nextButton]}
        >
          <Text style={styles.nextButtonText}>{onboardingUIStrings.next}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'flex-end',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  navButtonPlaceholder: {
    width: 90,
  },
  navButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  prevButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  prevButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  nextButton: {
    backgroundColor: colors.primary,
    ...shadows.button,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  ctaContainer: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    ...shadows.button,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
});
