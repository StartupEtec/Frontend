import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme/tokens';

interface ErrorBannerProps {
  message: string;
  testID?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  testID,
}) => {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText} testID={testID}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  bannerText: {
    color: colors.onErrorContainer,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
});
