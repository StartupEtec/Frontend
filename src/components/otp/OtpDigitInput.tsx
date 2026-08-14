import React, { forwardRef } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { colors, borderRadius, typography } from '../../theme/tokens';

interface OtpDigitInputProps {
  index: number;
  value: string;
  hasError: boolean;
  onChangeText: (index: number, digit: string) => void;
  onKeyPress: (index: number, key: string) => void;
}

/**
 * A single OTP digit input cell.
 * Renders a styled numeric TextInput with animated border feedback.
 */
export const OtpDigitInput = forwardRef<TextInput, OtpDigitInputProps>(
  ({ index, value, hasError, onChangeText, onKeyPress }, ref) => {
    const borderColor = hasError
      ? colors.error
      : value
      ? colors.primary
      : colors.border;

    return (
      <View
        style={[styles.cell, { borderColor }]}
        testID={`otp-cell-container-${index}`}
      >
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={(digit) => onChangeText(index, digit)}
          onKeyPress={({ nativeEvent }) => onKeyPress(index, nativeEvent.key)}
          keyboardType="numeric"
          maxLength={1}
          selectTextOnFocus
          caretHidden
          testID={`otp-input-${index}`}
          accessibilityLabel={`Dígito ${index + 1} del código OTP`}
          accessible
        />
      </View>
    );
  }
);

OtpDigitInput.displayName = 'OtpDigitInput';

const styles = StyleSheet.create({
  cell: {
    width: 48,
    height: 58,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
  },
});
