import React from 'react';
import { View, StyleSheet } from 'react-native';
import { OnboardingFooterProps } from '../../types/onboarding';
import { PaginationDots } from './PaginationDots';
import { PrimaryButton, SecondaryButton } from '../base';
import { onboardingUIStrings } from '../../i18n/onboardingContent';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

export const OnboardingFooter: React.FC<OnboardingFooterProps> = ({
  currentIndex,
  totalSlides,
  onNext,
  onPrev,
  onStart,
}) => {
  const isLastSlide = currentIndex === totalSlides - 1;
  const isFirstSlide = currentIndex === 0;

  if (isLastSlide) {
    return (
      <View style={styles.container}>
        <PaginationDots total={totalSlides} currentIndex={currentIndex} />

        <View style={styles.ctaContainer}>
          <PrimaryButton
            title={onboardingUIStrings.start}
            onPress={onStart}
            accentColor={colors.primary}
            testID="btn-onboarding-start"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PaginationDots total={totalSlides} currentIndex={currentIndex} />

      <View style={styles.navRow}>
        {!isFirstSlide ? (
          <SecondaryButton
            title={onboardingUIStrings.prev}
            onPress={onPrev}
            accentColor={colors.primary}
            testID="btn-onboarding-prev"
          />
        ) : (
          <View style={styles.navButtonPlaceholder} />
        )}

        <PrimaryButton
          title={onboardingUIStrings.next}
          onPress={onNext}
          accentColor={colors.primary}
          testID="btn-onboarding-next"
        />
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
  ctaContainer: {
    marginTop: spacing.sm,
  },
});
