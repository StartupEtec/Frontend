import React from "react";
import { Text, StyleSheet } from "react-native";
import { colors, typography } from "../../theme/tokens";

interface OtpTimerProps {
  secondsRemaining: number;
}

/**
 * Displays the remaining time before the OTP code expires.
 * Turns red in the last 60 seconds to create urgency.
 */
export const OtpTimer: React.FC<OtpTimerProps> = ({ secondsRemaining }) => {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const isUrgent = secondsRemaining <= 60 && secondsRemaining > 0;
  const isExpired = secondsRemaining === 0;

  const textColor = isExpired
    ? colors.error
    : isUrgent
      ? "#F97316" // orange-500
      : colors.textSecondary;

  return (
    <Text
      style={[styles.timer, { color: textColor }]}
      testID="otp-timer"
      accessibilityLabel={`El código vence en ${formatted}`}
    >
      {isExpired ? "Código expirado" : `Código vence en ${formatted}`}
    </Text>
  );
};

const styles = StyleSheet.create({
  timer: {
    fontSize: typography.fontSizes.sm,
    fontWeight: "500",
    textAlign: "center",
  },
});
