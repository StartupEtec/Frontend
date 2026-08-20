import React, { forwardRef, useState } from "react";
import { TextInput, View, StyleSheet } from "react-native";
import { colors, borderRadius, typography } from "../../theme/tokens";

interface OtpDigitInputProps {
  index: number;
  value: string;
  hasError: boolean;
  onChangeText: (index: number, digit: string) => void;
  onKeyPress: (index: number, key: string) => void;
}

/**
 * A single OTP digit input cell.
 * Renders a styled numeric input with animated border feedback and focus indicator.
 */
export const OtpDigitInput = forwardRef<TextInput, OtpDigitInputProps>(
  ({ index, value, hasError, onChangeText, onKeyPress }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const borderColor = hasError
      ? colors.error
      : isFocused
        ? colors.primaryLight
        : value
          ? colors.primary
          : colors.border;

    const backgroundColor = isFocused ? "#1a2744" : "#1E293B";

    return (
      <View
        style={[
          styles.cell,
          { borderColor, backgroundColor },
          isFocused && styles.cellFocused,
        ]}
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
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          testID={`otp-input-${index}`}
          accessibilityLabel={`Dígito ${index + 1} del código OTP`}
          accessible
        />
        {isFocused && <View style={styles.focusIndicator} />}
      </View>
    );
  },
);

OtpDigitInput.displayName = "OtpDigitInput";

const styles = StyleSheet.create({
  cell: {
    width: 48,
    height: 58,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  cellFocused: {
    borderWidth: 2,
  },
  input: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
    height: "100%",
    padding: 0,
  },
  focusIndicator: {
    position: "absolute",
    bottom: 4,
    width: 16,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.primaryLight,
  },
});
