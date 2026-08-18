import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing, borderRadius, typography } from "../../theme/tokens";

interface RegisterTermsRowProps {
  acceptedTerms: boolean;
  onToggleTerms: () => void;
  onOpenTermsModal: () => void;
  touched: boolean;
  error?: string;
}

export const RegisterTermsRow: React.FC<RegisterTermsRowProps> = ({
  acceptedTerms,
  onToggleTerms,
  onOpenTermsModal,
  touched,
  error,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.termsRow}>
        <TouchableOpacity
          style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}
          onPress={onToggleTerms}
          testID="checkbox-terms"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}
        >
          {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <Text style={styles.termsText}>Acepto los </Text>
        <TouchableOpacity onPress={onOpenTermsModal} testID="btn-open-terms">
          <Text style={styles.termsLink}>Términos y Condiciones</Text>
        </TouchableOpacity>
      </View>
      {touched && error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.xs,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "bold",
  },
  termsText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  termsLink: {
    color: colors.primaryLight,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
});
